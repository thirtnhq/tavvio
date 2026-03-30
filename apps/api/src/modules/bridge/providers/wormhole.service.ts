// apps/api/src/modules/bridge/providers/wormhole.service.ts
//
// Wormhole cross-chain messaging
// Docs: https://docs.wormhole.com/wormhole
//
// How Wormhole works:
//   1. Lock/burn asset in Wormhole contract on source chain
//   2. Wormhole Guardian network observes and signs a VAA (Verified Action Approval)
//   3. Relay polls Wormhole API for signed VAA (~1-2 minutes)
//   4. Submit VAA to destination chain → asset unlocked/minted
//
// Used for: BNB Chain, Solana, and any asset that CCTP does not support natively.

import { Injectable, Logger } from '@nestjs/common';
import {
  wormhole,
  Chain as WormholeChain,
  Wormhole,
  signSendWait,
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import { ethers } from 'ethers';
import { Horizon, Keypair } from '@stellar/stellar-sdk';
import {
  BridgeInParams,
  BridgeInResult,
  BridgeOutParams,
  BridgeOutResult,
  CompleteSourceLockParams,
} from '@tavvio/types';

type SupportedChain =
  | 'ethereum'
  | 'base'
  | 'bnb'
  | 'polygon'
  | 'arbitrum'
  | 'avalanche'
  | 'solana'
  | 'stellar';

interface TxResponseLike {
  wait(confirmations?: number): Promise<unknown>;
}

interface TxReceiptLike {
  hash: string;
}

interface SafeBridgeInParams {
  fromChain: SupportedChain;
  asset: string;
  amount: bigint;
  hashlock: string;
  senderAddress: string;
}

interface SafeBridgeOutParams {
  toChain: SupportedChain;
  asset: string;
  amount: bigint;
  recipientAddress: string;
}

interface SafeCompleteSourceLockParams {
  chain: SupportedChain;
  lockId: string;
  preimage: string;
}

interface HashLike {
  hash: string;
}

interface WormholeTransferLike {
  transfer: unknown;
  txids?: Array<{ txid?: string }>;
  fetchAttestation(timeoutMs: number): Promise<unknown>;
  redeem(dstContext: unknown, vaa: unknown): Promise<unknown>;
}

interface WormholeClientLike {
  getChain(chain: string): unknown;
  tokenTransfer(
    protocol: string,
    transfer: {
      token: {
        chain: string;
        address: ReturnType<typeof Wormhole.chainAddress>;
      };
      amount: bigint;
    },
    from: { chain: string; address: ReturnType<typeof Wormhole.chainAddress> },
    to: { chain: string; address: ReturnType<typeof Wormhole.chainAddress> },
    automatic: boolean,
  ): Promise<WormholeTransferLike>;
}

// ── Wormhole ↔ Tavvio chain name mapping ────────────────────────────────────

const CHAIN_MAP: Record<SupportedChain, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  bnb: 'Bsc',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  avalanche: 'Avalanche',
  solana: 'Solana',
  stellar: 'Stellar',
};

// ── Tavvio EVM HTLC ABI (same as in CCTP service) ──────────────────────────

const HTLC_ABI = [
  'function withdraw(bytes32 lockId, bytes32 preimage) returns (bool)',
  'function refund(bytes32 lockId) returns (bool)',
  'function locks(bytes32) view returns (address,address,address,uint256,bytes32,uint256,bool,bool)',
];

@Injectable()
export class WormholeService {
  private readonly logger = new Logger(WormholeService.name);
  private wh!: Wormhole<'Mainnet' | 'Testnet'>;
  private isTestnet = false;
  private relayEvmWallet: ethers.Wallet | null = null;

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  async onModuleInit() {
    this.isTestnet = process.env.STELLAR_NETWORK !== 'mainnet';
    const env = this.isTestnet ? 'Testnet' : 'Mainnet';

    // Initialize Wormhole SDK with all supported chain platforms
    this.wh = await wormhole(env, [evm, solana] as never);

    this.relayEvmWallet = new ethers.Wallet(process.env.EVM_RELAY_PRIVATE_KEY!);

    this.logger.log(`Wormhole initialized on ${env}`);
  }

  // ── Inbound: EVM / Solana → Stellar ──────────────────────────────────────

  async bridgeToStellar(params: BridgeInParams): Promise<BridgeInResult> {
    const safeParams = this.normalizeBridgeInParams(params);
    const srcChain = this.toWormholeChain(safeParams.fromChain);

    this.logger.log(
      `Wormhole bridgeToStellar: ${safeParams.fromChain} → stellar | ${safeParams.asset} | ${safeParams.amount}`,
    );

    if (safeParams.fromChain === 'solana') {
      return this.bridgeSolanaToStellar(safeParams);
    }

    // ── EVM → Stellar via Wormhole Token Bridge ──────────────────────────────

    const provider = this.getEvmProvider(safeParams.fromChain);
    const signer = this.getRelayEvmWallet().connect(provider);
    const srcContext = this.getWhChain(srcChain);

    // Encode Stellar recipient
    const stellarRecipient = this.chainAddress(
      'Stellar',
      process.env.STELLAR_RELAY_PUBLIC_KEY!,
    );

    // Initiate the token transfer
    this.logger.log(
      `Initiating Wormhole token transfer from ${safeParams.fromChain}...`,
    );

    // Build and submit the transfer transaction
    const xfer = await this.getWhClient().tokenTransfer(
      'TokenBridge',
      {
        token: {
          chain: srcChain,
          address: this.getTokenAddress(safeParams.fromChain, safeParams.asset),
        },
        amount: safeParams.amount,
      },
      {
        chain: srcChain,
        address: this.chainAddress(srcChain, signer.address),
      },
      { chain: 'Stellar', address: stellarRecipient },
      false, // not automatic relay (we handle manually for HTLC flow)
    );

    // Sign and send the source transaction
    const srcTxids = await signSendWait(
      srcContext as never,
      xfer.transfer as never,
      this.getEvmSigner(safeParams.fromChain) as never,
    );
    const srcTxHash = srcTxids[0]?.txid ?? '';

    this.logger.log(`Wormhole source tx: ${srcTxHash}. Waiting for VAA...`);

    // Wait for Guardian signatures (VAA)
    const vaa = await this.waitForVaa(xfer);

    this.logger.log(`VAA received. Redeeming on Stellar...`);

    // Redeem on Stellar
    const dstContext = this.getWhChain('Stellar');
    const redeemTxids = await signSendWait(
      dstContext as never,
      (await xfer.redeem(dstContext, vaa)) as never,
      this.getStellarSigner() as never,
    );

    const redeemTxHash = redeemTxids[0]?.txid ?? '';
    this.logger.log(`Wormhole redemption on Stellar: ${redeemTxHash}`);

    return {
      sourceTxHash: srcTxHash,
      sourceLockId: safeParams.hashlock,
      bridgeTxId: this.getVaaHash(vaa),
      provider: 'wormhole',
    };
  }

  // ── Solana → Stellar (special case) ─────────────────────────────────────────

  private async bridgeSolanaToStellar(
    params: SafeBridgeInParams,
  ): Promise<BridgeInResult> {
    this.logger.log(
      `Wormhole Solana → Stellar: ${params.asset} ${params.amount}`,
    );

    const dstContext = this.getWhChain('Stellar');

    const xfer = await this.getWhClient().tokenTransfer(
      'TokenBridge',
      {
        token: {
          chain: 'Solana',
          address: this.getTokenAddress('solana', params.asset),
        },
        amount: params.amount,
      },
      {
        chain: 'Solana',
        address: Wormhole.chainAddress('Solana', params.senderAddress),
      },
      {
        chain: 'Stellar',
        address: this.chainAddress(
          'Stellar',
          process.env.STELLAR_RELAY_PUBLIC_KEY!,
        ),
      },
      false,
    );

    // NOTE: For Solana, the payer signs in the checkout UI (Phantom wallet).
    // The relay service picks up from here after the source tx is confirmed.

    const vaa = await this.waitForVaa(xfer);
    await signSendWait(
      dstContext as never,
      (await xfer.redeem(dstContext, vaa)) as never,
      this.getStellarSigner() as never,
    );

    return {
      sourceTxHash: xfer.txids?.[0]?.txid ?? '',
      sourceLockId: params.hashlock,
      bridgeTxId: this.getVaaHash(vaa),
      provider: 'wormhole',
    };
  }

  // ── Outbound: Stellar → EVM / Solana ─────────────────────────────────────

  async bridgeFromStellar(params: BridgeOutParams): Promise<BridgeOutResult> {
    const safeParams = this.normalizeBridgeOutParams(params);
    const dstChain = this.toWormholeChain(safeParams.toChain);

    this.logger.log(
      `Wormhole bridgeFromStellar: stellar → ${safeParams.toChain} | ${safeParams.asset} | ${safeParams.amount}`,
    );

    const srcContext = this.getWhChain('Stellar');
    const dstContext = this.getWhChain(dstChain);

    const xfer = await this.getWhClient().tokenTransfer(
      'TokenBridge',
      {
        token: {
          chain: 'Stellar',
          address: this.getTokenAddress('stellar', safeParams.asset),
        },
        amount: safeParams.amount,
      },
      {
        chain: 'Stellar',
        address: this.chainAddress(
          'Stellar',
          process.env.STELLAR_RELAY_PUBLIC_KEY!,
        ),
      },
      {
        chain: dstChain,
        address: this.chainAddress(dstChain, safeParams.recipientAddress),
      },
      false,
    );

    // Send from Stellar
    const srcTxids = await signSendWait(
      srcContext as never,
      xfer.transfer as never,
      this.getStellarSigner() as never,
    );
    const srcTxHash = srcTxids[0]?.txid ?? '';

    this.logger.log(
      `Wormhole Stellar source tx: ${srcTxHash}. Waiting for VAA...`,
    );

    const vaa = await this.waitForVaa(xfer);

    this.logger.log(`VAA ready. Redeeming on ${safeParams.toChain}...`);

    // Redeem on destination chain
    const redeemTxids = await signSendWait(
      dstContext as never,
      (await xfer.redeem(dstContext, vaa)) as never,
      safeParams.toChain === 'solana'
        ? (this.getSolanaSigner() as never)
        : (this.getEvmSigner(safeParams.toChain) as never),
    );

    const destTxHash = redeemTxids[0]?.txid ?? '';
    this.logger.log(
      `Wormhole redemption on ${safeParams.toChain}: ${destTxHash}`,
    );

    return {
      destTxHash,
      bridgeTxId: this.getVaaHash(vaa),
      provider: 'wormhole',
    };
  }

  // ── Complete EVM HTLC ────────────────────────────────────────────────────────

  async completeEvmHtlc(
    params: CompleteSourceLockParams,
  ): Promise<{ txHash: string }> {
    const safeParams = this.normalizeCompleteSourceLockParams(params);

    const provider = this.getEvmProvider(safeParams.chain);
    const signer = this.getRelayEvmWallet().connect(provider);

    const htlcAddress =
      process.env[`HTLC_ADDRESS_${safeParams.chain.toUpperCase()}`];
    if (!htlcAddress)
      throw new Error(`No HTLC address for ${safeParams.chain}`);

    const htlc = new ethers.Contract(htlcAddress, HTLC_ABI, signer);

    const preimageBytes = ethers.zeroPadValue(
      ethers.hexlify(ethers.toUtf8Bytes(safeParams.preimage)),
      32,
    );

    const tx = (await htlc.withdraw(
      safeParams.lockId,
      preimageBytes,
    )) as TxResponseLike;
    const receipt = (await tx.wait(1)) as TxReceiptLike;

    this.logger.log(
      `EVM HTLC completed via Wormhole relay. TxHash: ${receipt.hash}`,
    );
    return { txHash: receipt.hash };
  }

  // ── Complete Solana HTLC ─────────────────────────────────────────────────────

  async completeSolanaHtlc(
    params: CompleteSourceLockParams,
  ): Promise<{ txHash: string }> {
    // Call your deployed Solana HTLC program to withdraw using the revealed preimage.
    // Requires @solana/web3.js and your HTLC program IDL.
    //
    // This is a placeholder — implement with Anchor framework:
    // const program = new anchor.Program(IDL, SOLANA_HTLC_PROGRAM_ID, provider);
    // const tx = await program.methods.withdraw(lockId, preimage).rpc();
    await Promise.resolve();
    void params;
    this.logger.warn('Solana HTLC completion — placeholder implementation');
    throw new Error('Solana HTLC completion not yet implemented');
  }

  // ── Internal Helpers ─────────────────────────────────────────────────────────

  private async waitForVaa(
    xfer: WormholeTransferLike,
    timeoutMs = 120_000,
  ): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const vaa = await xfer.fetchAttestation(10_000);
      if (vaa) return vaa;
      this.logger.debug('Waiting for Wormhole VAA...');
    }
    throw new Error(`Wormhole VAA timeout after ${timeoutMs}ms`);
  }

  private toWormholeChain(chain: SupportedChain): string {
    const mapped = CHAIN_MAP[chain];
    if (!mapped) throw new Error(`Chain not supported by Wormhole: ${chain}`);
    return mapped;
  }

  private getEvmProvider(chain: SupportedChain): ethers.JsonRpcProvider {
    const rpcKey = `RPC_${chain.toUpperCase()}`;
    const url = process.env[rpcKey];
    if (!url)
      throw new Error(`No RPC configured for ${chain} (env: ${rpcKey})`);
    return new ethers.JsonRpcProvider(url);
  }

  private getEvmSigner(chain: SupportedChain) {
    // Returns a Wormhole-compatible EVM signer
    const provider = this.getEvmProvider(chain);
    const wallet = this.getRelayEvmWallet().connect(provider);
    return {
      chain: this.toWormholeChain(chain),
      address: this.chainAddress(this.toWormholeChain(chain), wallet.address),
      signAndSend: async (txs: unknown[]) => {
        const results: string[] = [];
        for (const tx of txs) {
          const submitted = await wallet.sendTransaction(
            tx as ethers.TransactionRequest,
          );
          const receipt = await submitted.wait();
          results.push(receipt!.hash);
        }
        return results;
      },
    };
  }

  private getStellarSigner() {
    // Returns a Wormhole-compatible Stellar signer using the relay keypair
    const kp = Keypair.fromSecret(process.env.STELLAR_RELAY_KEYPAIR_SECRET!);
    return {
      chain: 'Stellar' as WormholeChain,
      address: this.chainAddress('Stellar', kp.publicKey()),
      signAndSend: async (txs: unknown[]) => {
        const results: string[] = [];
        const server = new Horizon.Server(process.env.STELLAR_HORIZON_URL!);
        for (const tx of txs) {
          const signable = tx as {
            sign: (keypair: ReturnType<typeof Keypair.fromSecret>) => void;
          };
          signable.sign(kp);
          const result = (await server.submitTransaction(
            tx as Parameters<typeof server.submitTransaction>[0],
          )) as HashLike;
          results.push(result.hash);
        }
        return results;
      },
    };
  }

  private getSolanaSigner() {
    // Placeholder — implement with @solana/web3.js Keypair
    throw new Error('Solana signer not yet implemented');
  }

  private getTokenAddress(
    chain: SupportedChain,
    asset: string,
  ): ReturnType<typeof Wormhole.chainAddress> {
    // Returns the Wormhole-compatible token address for a given chain + symbol
    // In production: maintain a token registry mapping (chain, symbol) → address
    const registry: Record<string, Record<string, string>> = {
      ethereum: { USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      base: { USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
      bnb: { USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
      polygon: { USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
      arbitrum: { USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
      avalanche: { USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
      solana: { USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      stellar: {
        USDC: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      },
    };
    const addr = registry[chain]?.[asset.toUpperCase()];
    if (!addr) throw new Error(`No token address for ${asset} on ${chain}`);
    return this.chainAddress(this.toWormholeChain(chain), addr);
  }

  private getWhClient(): WormholeClientLike {
    return this.wh as unknown as WormholeClientLike;
  }

  private getWhChain(chain: string): unknown {
    return this.getWhClient().getChain(chain);
  }

  private chainAddress(
    chain: string,
    address: string,
  ): ReturnType<typeof Wormhole.chainAddress> {
    return Wormhole.chainAddress(chain as unknown as WormholeChain, address);
  }

  private getRelayEvmWallet(): ethers.Wallet {
    if (!this.relayEvmWallet) {
      throw new Error('Relay EVM wallet not initialized');
    }
    return this.relayEvmWallet;
  }

  private getVaaHash(vaa: unknown): string {
    if (WormholeService.isRecord(vaa) && typeof vaa.hash === 'string') {
      return vaa.hash;
    }
    return '';
  }

  private normalizeBridgeInParams(params: BridgeInParams): SafeBridgeInParams {
    if (!WormholeService.isRecord(params)) {
      throw new Error('Invalid bridge params');
    }

    const { fromChain, asset, amount, hashlock, senderAddress } = params;
    if (typeof fromChain !== 'string' || !this.isSupportedChain(fromChain)) {
      throw new Error('Invalid bridge params: fromChain is required');
    }
    if (typeof asset !== 'string' || asset.length === 0) {
      throw new Error('Invalid bridge params: asset is required');
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

    return {
      fromChain,
      asset,
      amount: typeof amount === 'bigint' ? amount : BigInt(amount),
      hashlock,
      senderAddress,
    };
  }

  private normalizeBridgeOutParams(
    params: BridgeOutParams,
  ): SafeBridgeOutParams {
    if (!WormholeService.isRecord(params)) {
      throw new Error('Invalid bridge out params');
    }

    const { toChain, asset, amount, recipientAddress } = params;
    if (typeof toChain !== 'string' || !this.isSupportedChain(toChain)) {
      throw new Error('Invalid bridge out params: toChain is required');
    }
    if (typeof asset !== 'string' || asset.length === 0) {
      throw new Error('Invalid bridge out params: asset is required');
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

    return {
      toChain,
      asset,
      amount: typeof amount === 'bigint' ? amount : BigInt(amount),
      recipientAddress,
    };
  }

  private normalizeCompleteSourceLockParams(
    params: CompleteSourceLockParams,
  ): SafeCompleteSourceLockParams {
    if (!WormholeService.isRecord(params)) {
      throw new Error('Invalid complete HTLC params');
    }

    const { chain, lockId, preimage } = params;
    if (typeof chain !== 'string' || !this.isSupportedChain(chain)) {
      throw new Error('Invalid complete HTLC params: chain is required');
    }
    if (typeof lockId !== 'string' || lockId.length === 0) {
      throw new Error('Invalid complete HTLC params: lockId is required');
    }
    if (typeof preimage !== 'string') {
      throw new Error('Invalid complete HTLC params: preimage is required');
    }

    return { chain, lockId, preimage };
  }

  private isSupportedChain(chain: string): chain is SupportedChain {
    return chain in CHAIN_MAP;
  }
}
