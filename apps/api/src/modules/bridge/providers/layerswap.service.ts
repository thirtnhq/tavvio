// apps/api/src/modules/bridge/providers/layerswap.service.ts
//
// Layerswap API — used exclusively for Starknet bridging
// Docs: https://docs.layerswap.io
//
// Layerswap is the only reliable bridge between Stellar and Starknet as of 2026.
// Starknet uses its own proving system and is not yet on Wormhole or CCTP.
//
// API base: https://api.layerswap.io/api/v2

import { Injectable, Logger } from '@nestjs/common';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { Account, Contract, RpcProvider } from 'starknet';
import {
  BridgeInParams,
  BridgeInResult,
  BridgeOutParams,
  BridgeOutResult,
  CompleteSourceLockParams,
} from '@useroutr/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LayerswapQuote {
  quote_id: string;
  receive_amount: number;
  min_receive_amount: number;
  total_fee: number;
  avg_completion_time: { total_seconds: number };
}

interface LayerswapSwap {
  id: string;
  status: LayerswapStatus;
  source_network: string;
  destination_network: string;
  source_token: string;
  destination_token: string;
  amount: number;
  destination_address: string;
  deposit_address?: string; // where to send funds (for manual deposits)
  deposit_memo?: string; // memo for Stellar deposits
}

interface SubmitTxResultLike {
  hash: string;
}

interface StarknetWithdrawResultLike {
  transaction_hash: string;
}

type BridgeAsset = 'USDC' | 'XLM';

interface SafeBridgeInParams {
  asset: BridgeAsset;
  amount: bigint;
  hashlock: string;
  senderAddress: string;
  paymentId: string;
}

interface SafeBridgeOutParams {
  asset: BridgeAsset;
  amount: bigint;
  recipientAddress: string;
  paymentId: string;
}

interface SafeCompleteParams {
  lockId: string;
  preimage: string;
}

type LayerswapStatus =
  | 'created'
  | 'pending'
  | 'user_transfer_pending' // waiting for user to send funds
  | 'ls_transfer_pending' // Layerswap is sending on destination
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

// ── Layerswap Network Names ────────────────────────────────────────────────────
// Use Layerswap's exact network identifiers from their /api/v2/networks endpoint

const LAYERSWAP_NETWORKS = {
  stellar: 'STELLAR_MAINNET', // 'STELLAR_TESTNET' for testnet
  starknet: 'STARKNET_MAINNET', // 'STARKNET_TESTNET' for testnet
  ethereum: 'ETHEREUM_MAINNET',
  base: 'BASE_MAINNET',
} as const;

const LAYERSWAP_NETWORKS_TESTNET = {
  stellar: 'STELLAR_TESTNET',
  starknet: 'STARKNET_TESTNET',
  ethereum: 'ETHEREUM_SEPOLIA',
  base: 'BASE_SEPOLIA',
} as const;

const STARKNET_HTLC_CONTRACT = process.env.STARKNET_HTLC_CONTRACT_ADDRESS!;

@Injectable()
export class LayerswapService {
  private readonly logger = new Logger(LayerswapService.name);
  private readonly baseUrl = 'https://api.layerswap.io/api/v2';
  private readonly apiKey: string;
  private readonly isTestnet: boolean;

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  constructor() {
    this.apiKey = process.env.LAYERSWAP_API_KEY!;
    this.isTestnet = process.env.STELLAR_NETWORK !== 'mainnet';

    if (!this.apiKey) {
      this.logger.warn(
        'LAYERSWAP_API_KEY not set — Starknet bridging will fail',
      );
    }
  }

  // ── Inbound: Starknet → Stellar ──────────────────────────────────────────────

  async bridgeToStellar(params: BridgeInParams): Promise<BridgeInResult> {
    const safeParams = this.normalizeBridgeInParams(params);

    this.logger.log(
      `Layerswap bridgeToStellar: starknet → stellar | ${safeParams.asset} | ${safeParams.amount}`,
    );

    // Step 1: Get a quote
    const quote = await this.getQuote({
      sourceNetwork: this.networkName('starknet'),
      destNetwork: this.networkName('stellar'),
      sourceToken: safeParams.asset,
      destToken: safeParams.asset,
      amount: Number(safeParams.amount) / 1e6, // convert from micro-units to USDC
    });

    this.logger.log(
      `Layerswap quote: receive ${quote.min_receive_amount} ${safeParams.asset}`,
    );

    // Step 2: Create the swap
    const swap = await this.createSwap({
      quoteId: quote.quote_id,
      sourceNetwork: this.networkName('starknet'),
      destNetwork: this.networkName('stellar'),
      sourceToken: safeParams.asset,
      destToken: safeParams.asset,
      amount: Number(safeParams.amount) / 1e6,
      destinationAddress: process.env.STELLAR_RELAY_PUBLIC_KEY!,
      sourceAddress: safeParams.senderAddress,
      referenceId: safeParams.paymentId,
    });

    this.logger.log(
      `Layerswap swap created: ${swap.id}. Status: ${swap.status}`,
    );

    // Step 3: Return deposit details to checkout UI
    // The payer will send funds to swap.deposit_address on Starknet.
    // This is handled in the checkout frontend — we return the swap info
    // so the UI can show the payer where to send.

    // Step 4: Poll for completion (in relay service, not blocking here)
    // The relay service calls pollSwapStatus() via BullMQ job.

    return {
      sourceTxHash: swap.id, // Layerswap swap ID (no source tx yet)
      sourceLockId: safeParams.hashlock,
      bridgeTxId: swap.id,
      provider: 'layerswap',
    };
  }

  // ── Outbound: Stellar → Starknet ─────────────────────────────────────────────

  async bridgeFromStellar(params: BridgeOutParams): Promise<BridgeOutResult> {
    const safeParams = this.normalizeBridgeOutParams(params);

    this.logger.log(
      `Layerswap bridgeFromStellar: stellar → starknet | ${safeParams.asset} | ${safeParams.amount}`,
    );

    // Step 1: Quote
    const quote = await this.getQuote({
      sourceNetwork: this.networkName('stellar'),
      destNetwork: this.networkName('starknet'),
      sourceToken: safeParams.asset,
      destToken: safeParams.asset,
      amount: Number(safeParams.amount) / 1e6,
    });

    // Step 2: Create swap
    const swap = await this.createSwap({
      quoteId: quote.quote_id,
      sourceNetwork: this.networkName('stellar'),
      destNetwork: this.networkName('starknet'),
      sourceToken: safeParams.asset,
      destToken: safeParams.asset,
      amount: Number(safeParams.amount) / 1e6,
      destinationAddress: safeParams.recipientAddress, // merchant's Starknet address
      sourceAddress: process.env.STELLAR_RELAY_PUBLIC_KEY!,
      referenceId: safeParams.paymentId,
    });

    this.logger.log(
      `Layerswap swap created: ${swap.id}. ` +
        `Deposit address: ${swap.deposit_address} | Memo: ${swap.deposit_memo}`,
    );

    // Step 3: Send USDC from Useroutr's Stellar relay wallet to Layerswap's deposit address
    //         with the required memo
    if (!swap.deposit_address) {
      throw new Error('Layerswap did not return a Stellar deposit address');
    }

    const server = new Horizon.Server(process.env.STELLAR_HORIZON_URL!);
    const relayKp = Keypair.fromSecret(
      process.env.STELLAR_RELAY_KEYPAIR_SECRET!,
    );
    const account = await server.loadAccount(relayKp.publicKey());

    const usdcAsset = new Asset(
      'USDC',
      this.isTestnet
        ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' // testnet issuer
        : 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', // mainnet issuer
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.isTestnet ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.payment({
          destination: swap.deposit_address,
          asset: usdcAsset,
          amount: (Number(safeParams.amount) / 1e7).toFixed(7),
        }),
      )
      .addMemo(Memo.text(swap.deposit_memo ?? ''))
      .setTimeout(30)
      .build();

    tx.sign(relayKp);
    const result = (await server.submitTransaction(tx)) as SubmitTxResultLike;

    this.logger.log(
      `Sent USDC to Layerswap deposit address. StellarTxHash: ${result.hash}`,
    );

    // Step 4: Poll for completion
    const completedSwap = await this.pollSwapStatus(swap.id, 180_000);

    if (completedSwap.status !== 'completed') {
      throw new Error(
        `Layerswap swap ${swap.id} did not complete. Final status: ${completedSwap.status}`,
      );
    }

    this.logger.log(`Layerswap swap ${swap.id} completed.`);

    return {
      destTxHash: completedSwap.id, // Layerswap doesn't always expose dest tx hash directly
      bridgeTxId: swap.id,
      provider: 'layerswap',
    };
  }

  // ── Complete Starknet HTLC ───────────────────────────────────────────────────

  async completeStarknetHtlc(
    params: CompleteSourceLockParams,
  ): Promise<{ txHash: string }> {
    const safeParams = this.normalizeCompleteSourceLockParams(params);

    this.logger.log(`Completing Starknet HTLC. lockId: ${safeParams.lockId}`);

    // Use Starknet.js to call the HTLC contract
    // Install: npm install starknet
    const provider = new RpcProvider({
      nodeUrl: this.isTestnet
        ? 'https://starknet-testnet.public.blastapi.io'
        : 'https://starknet-mainnet.public.blastapi.io',
    });

    const account = new Account({
      provider,
      address: process.env.STARKNET_RELAY_ADDRESS!,
      signer: process.env.STARKNET_RELAY_PRIVATE_KEY!,
    });

    // Starknet HTLC ABI (minimal — matches your Cairo contract)
    const HTLC_ABI = [
      {
        name: 'withdraw',
        type: 'function',
        inputs: [
          { name: 'lock_id', type: 'felt252' },
          { name: 'preimage', type: 'felt252' },
        ],
        outputs: [{ type: 'felt252' }],
      },
    ];

    const contract = new Contract({
      abi: HTLC_ABI,
      address: STARKNET_HTLC_CONTRACT,
      providerOrAccount: account,
    });

    const result = (await contract.invoke(
      'withdraw',
      [safeParams.lockId, safeParams.preimage],
      { waitForTransaction: false },
    )) as StarknetWithdrawResultLike;
    await provider.waitForTransaction(result.transaction_hash);

    this.logger.log(
      `Starknet HTLC completed. TxHash: ${result.transaction_hash}`,
    );

    return { txHash: result.transaction_hash };
  }

  // ── Polling ──────────────────────────────────────────────────────────────────

  private normalizeBridgeInParams(params: BridgeInParams): SafeBridgeInParams {
    if (!LayerswapService.isRecord(params)) {
      throw new Error('Invalid bridge params');
    }

    const { asset, amount, hashlock, senderAddress, paymentId } = params;
    if (asset !== 'USDC' && asset !== 'XLM') {
      throw new Error('Invalid bridge params: unsupported asset');
    }
    if (
      typeof amount !== 'bigint' &&
      typeof amount !== 'number' &&
      typeof amount !== 'string'
    ) {
      throw new Error('Invalid bridge params: amount is required');
    }
    if (typeof hashlock !== 'string' || hashlock.length === 0) {
      throw new Error('Invalid bridge params: hashlock is required');
    }
    if (typeof senderAddress !== 'string' || senderAddress.length === 0) {
      throw new Error('Invalid bridge params: senderAddress is required');
    }
    if (typeof paymentId !== 'string' || paymentId.length === 0) {
      throw new Error('Invalid bridge params: paymentId is required');
    }

    return {
      asset,
      amount: typeof amount === 'bigint' ? amount : BigInt(amount),
      hashlock,
      senderAddress,
      paymentId,
    };
  }

  private normalizeBridgeOutParams(
    params: BridgeOutParams,
  ): SafeBridgeOutParams {
    if (!LayerswapService.isRecord(params)) {
      throw new Error('Invalid bridge out params');
    }

    const { asset, amount, recipientAddress, paymentId } = params;
    if (asset !== 'USDC' && asset !== 'XLM') {
      throw new Error('Invalid bridge out params: unsupported asset');
    }
    if (
      typeof amount !== 'bigint' &&
      typeof amount !== 'number' &&
      typeof amount !== 'string'
    ) {
      throw new Error('Invalid bridge out params: amount is required');
    }
    if (typeof recipientAddress !== 'string' || recipientAddress.length === 0) {
      throw new Error(
        'Invalid bridge out params: recipientAddress is required',
      );
    }
    if (typeof paymentId !== 'string' || paymentId.length === 0) {
      throw new Error('Invalid bridge out params: paymentId is required');
    }

    return {
      asset,
      amount: typeof amount === 'bigint' ? amount : BigInt(amount),
      recipientAddress,
      paymentId,
    };
  }

  private normalizeCompleteSourceLockParams(
    params: CompleteSourceLockParams,
  ): SafeCompleteParams {
    if (!LayerswapService.isRecord(params)) {
      throw new Error('Invalid complete HTLC params');
    }

    const { lockId, preimage } = params;
    if (typeof lockId !== 'string' || lockId.length === 0) {
      throw new Error('Invalid complete HTLC params: lockId is required');
    }
    if (typeof preimage !== 'string') {
      throw new Error('Invalid complete HTLC params: preimage is required');
    }

    return { lockId, preimage };
  }

  async pollSwapStatus(
    swapId: string,
    timeoutMs = 300_000,
  ): Promise<LayerswapSwap> {
    const intervalMs = 5_000;
    const maxRetries = Math.floor(timeoutMs / intervalMs);

    for (let i = 0; i < maxRetries; i++) {
      const swap = await this.getSwap(swapId);

      this.logger.debug(
        `Layerswap ${swapId} status: ${swap.status} (attempt ${i + 1})`,
      );

      const terminalStatuses: LayerswapStatus[] = [
        'completed',
        'failed',
        'expired',
        'cancelled',
      ];
      if (terminalStatuses.includes(swap.status)) {
        return swap;
      }

      await this.sleep(intervalMs);
    }

    throw new Error(`Layerswap poll timeout for swap: ${swapId}`);
  }

  // ── Layerswap REST API Wrappers ──────────────────────────────────────────────

  private async getQuote(params: {
    sourceNetwork: string;
    destNetwork: string;
    sourceToken: string;
    destToken: string;
    amount: number;
  }): Promise<LayerswapQuote> {
    const res = await this.request<LayerswapQuote>(
      'GET',
      `/quote?source=${params.sourceNetwork}&destination=${params.destNetwork}` +
        `&source_asset=${params.sourceToken}&destination_asset=${params.destToken}` +
        `&amount=${params.amount}`,
    );
    return res.data;
  }

  private async createSwap(params: {
    quoteId: string;
    sourceNetwork: string;
    destNetwork: string;
    sourceToken: string;
    destToken: string;
    amount: number;
    destinationAddress: string;
    sourceAddress: string;
    referenceId: string;
  }): Promise<LayerswapSwap> {
    const res = await this.request<LayerswapSwap>('POST', '/swaps', {
      quote_id: params.quoteId,
      source_network: params.sourceNetwork,
      destination_network: params.destNetwork,
      source_token: params.sourceToken,
      destination_token: params.destToken,
      amount: params.amount,
      destination_address: params.destinationAddress,
      source_address: params.sourceAddress,
      reference_id: params.referenceId,
    });
    return res.data;
  }

  private async getSwap(swapId: string): Promise<LayerswapSwap> {
    const res = await this.request<LayerswapSwap>('GET', `/swaps/${swapId}`);
    return res.data;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
  ): Promise<{ data: T }> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-LS-APIKEY': this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Layerswap API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as unknown;
    if (!LayerswapService.isRecord(json) || !('data' in json)) {
      throw new Error('Invalid Layerswap API response format');
    }

    return json as { data: T };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private networkName(
    chain: 'stellar' | 'starknet' | 'ethereum' | 'base',
  ): string {
    const map = this.isTestnet
      ? LAYERSWAP_NETWORKS_TESTNET
      : LAYERSWAP_NETWORKS;
    return map[chain];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}
