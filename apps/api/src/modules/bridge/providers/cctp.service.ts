// apps/api/src/modules/bridge/providers/cctp.service.ts
//
// Circle CCTP (Cross-Chain Transfer Protocol)
// Docs: https://developers.circle.com/stablecoins/cctp
//
// How CCTP works:
//   1. Burn USDC on source chain (calls TokenMessenger.depositForBurn)
//   2. Circle's attestation service signs a message confirming the burn
//   3. Relay polls Circle's Attestation API until signature is ready (~20s)
//   4. Submit attestation to destination MessageTransmitter → USDC minted
//
// Supported chains (2026):
//   Ethereum, Base, Avalanche, Arbitrum, Polygon ↔ Stellar
//
// Note: CCTP between Stellar and EVM chains uses Wormhole's CCTP integration
// because Stellar's CCTP MessageTransmitter is bridged via Wormhole.

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import type {
  BridgeInParams,
  BridgeInResult,
  BridgeOutParams,
  BridgeOutResult,
  CompleteSourceLockParams,
} from '@useroutr/types';

// ── CCTP Contract ABIs (minimal — only what we call) ─────────────────────────

const TOKEN_MESSENGER_ABI = [
  // Burn USDC on source chain
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64 nonce)',
  // Events
  'event MessageSent(bytes message)',
  'event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)',
];

const MESSAGE_TRANSMITTER_ABI = [
  // Receive attestation on destination chain — mints USDC
  'function receiveMessage(bytes message, bytes attestation) returns (bool success)',
  'function usedNonces(bytes32 sourceAndNonce) view returns (uint256)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

const HTLC_ABI = [
  'function withdraw(bytes32 lockId, bytes32 preimage) returns (bool)',
  'function refund(bytes32 lockId) returns (bool)',
  'function locks(bytes32) view returns (address sender, address receiver, address token, uint256 amount, bytes32 hashlock, uint256 timelock, bool withdrawn, bool refunded)',
];

// ── CCTP Chain Domains & Contract Addresses ──────────────────────────────────
// Circle assigns a unique domain ID to each supported chain

interface ChainConfig {
  domain: number; // CCTP domain ID
  rpcEnvKey: string; // process.env key for RPC URL
  tokenMessenger: string; // burns USDC
  messageTransmitter: string; // receives attestation
  usdcAddress: string; // USDC token contract
  htlcAddress?: string; // Useroutr's HTLC contract (from env)
}

type SupportedChain =
  | 'ethereum'
  | 'base'
  | 'avalanche'
  | 'arbitrum'
  | 'polygon';

const CHAIN_CONFIG: Record<SupportedChain, ChainConfig> = {
  ethereum: {
    domain: 0,
    rpcEnvKey: 'RPC_ETHEREUM',
    tokenMessenger: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitter: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  base: {
    domain: 6,
    rpcEnvKey: 'RPC_BASE',
    tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitter: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  avalanche: {
    domain: 1,
    rpcEnvKey: 'RPC_AVALANCHE',
    tokenMessenger: '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
    messageTransmitter: '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
  arbitrum: {
    domain: 3,
    rpcEnvKey: 'RPC_ARBITRUM',
    tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  polygon: {
    domain: 7,
    rpcEnvKey: 'RPC_POLYGON',
    tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
    messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
};

interface TxResponseLike {
  wait(confirmations?: number): Promise<unknown>;
}

interface TxReceiptLike {
  hash: string;
}

interface BurnReceiptLike extends TxReceiptLike {
  logs: unknown[];
}

// Stellar's CCTP domain (bridged through Wormhole)
const STELLAR_CCTP_DOMAIN = 5;

// Circle Attestation API
const ATTESTATION_API = {
  mainnet: 'https://iris-api.circle.com/attestations',
  testnet: 'https://iris-api-sandbox.circle.com/attestations',
};

@Injectable()
export class CctpService {
  private readonly logger = new Logger(CctpService.name);
  private readonly isTestnet: boolean;
  private readonly relayWallet: ethers.Wallet;

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  constructor() {
    this.isTestnet = process.env.STELLAR_NETWORK !== 'mainnet';
    // Relay wallet pays gas for completing HTLC unlocks and receiving attestations
    this.relayWallet = new ethers.Wallet(process.env.EVM_RELAY_PRIVATE_KEY!);
  }

  // ── Inbound: EVM Chain → Stellar ─────────────────────────────────────────────

  async bridgeToStellar(params: BridgeInParams): Promise<BridgeInResult> {
    const safeParams = this.normalizeBridgeInParams(params);

    const config = this.getChainConfig(safeParams.fromChain);
    const provider = this.getProvider(safeParams.fromChain);
    const signer = this.relayWallet.connect(provider);

    this.logger.log(
      `CCTP bridgeToStellar: ${safeParams.fromChain} → stellar | amount: ${safeParams.amount}`,
    );

    // Step 1: Lock funds in Useroutr's HTLC contract on the source chain
    //         (The payer calls this from their wallet in the checkout UI)
    //         Here in the service, we watch for the Locked event.
    //
    // In practice: the checkout frontend calls lock() on the HTLC contract.
    // The relay service detects the Locked event and calls bridgeToStellar.
    // So at this point, sourceLockId is already known.
    //
    // What we do here: burn the USDC from the HTLC contract via CCTP
    // so it can be minted on Stellar.

    // The HTLC holds the payer's USDC. After the Stellar side is locked,
    // we burn the equivalent USDC to bridge it over.
    // NOTE: In the full HTLC flow, the Soroban contract uses its own
    // liquidity. This burn is for rebalancing the liquidity pool.
    const tokenMessenger = new ethers.Contract(
      config.tokenMessenger,
      TOKEN_MESSENGER_ABI,
      signer,
    );

    const usdc = new ethers.Contract(config.usdcAddress, ERC20_ABI, signer);

    // Approve TokenMessenger to spend USDC
    const allowance = (await usdc.allowance(
      signer.address,
      config.tokenMessenger,
    )) as bigint;
    if (allowance < safeParams.amount) {
      this.logger.log('Approving CCTP TokenMessenger to spend USDC...');
      const approveTx = (await usdc.approve(
        config.tokenMessenger,
        ethers.MaxUint256,
      )) as TxResponseLike;
      await approveTx.wait(1);
    }

    // Encode Stellar recipient as bytes32
    // Stellar addresses are 56-char base32 — encode as UTF-8 padded to 32 bytes
    const mintRecipient = ethers.zeroPadValue(
      ethers.toUtf8Bytes(process.env.STELLAR_RELAY_PUBLIC_KEY!.slice(0, 32)),
      32,
    );

    // Burn USDC on source chain
    this.logger.log(
      `Burning ${safeParams.amount} USDC on ${safeParams.fromChain} via CCTP...`,
    );
    const burnTx = (await tokenMessenger.depositForBurn(
      safeParams.amount,
      STELLAR_CCTP_DOMAIN,
      mintRecipient,
      config.usdcAddress,
    )) as TxResponseLike;
    const burnReceipt = (await burnTx.wait(1)) as BurnReceiptLike;

    // Extract the message bytes from the MessageSent event
    const messageSentEvent = burnReceipt.logs
      .map((log): ethers.LogDescription | null => {
        if (!CctpService.isRecord(log)) {
          return null;
        }

        const data = log.data;
        const topics = log.topics;
        if (
          typeof data !== 'string' ||
          !Array.isArray(topics) ||
          !topics.every((topic): topic is string => typeof topic === 'string')
        ) {
          return null;
        }

        try {
          return tokenMessenger.interface.parseLog({ data, topics });
        } catch {
          return null;
        }
      })
      .find(
        (event): event is ethers.LogDescription =>
          event?.name === 'MessageSent',
      );

    if (!messageSentEvent) {
      throw new Error('MessageSent event not found in burn transaction');
    }

    const messageBytes = messageSentEvent.args[0] as unknown;
    if (typeof messageBytes !== 'string') {
      throw new Error('Invalid MessageSent event payload');
    }
    const messageHash = ethers.keccak256(messageBytes);

    this.logger.log(
      `CCTP burn confirmed. TxHash: ${burnReceipt.hash}. Polling attestation...`,
    );

    // Poll Circle's Attestation API until signature is ready
    await this.pollAttestation(messageHash);

    this.logger.log(`Attestation received. Minting USDC on Stellar side...`);

    // Submit to Stellar-side MessageTransmitter
    // (This is handled by the Wormhole integration that wraps CCTP on Stellar)
    // The Wormhole service receives the attestation and mints on Stellar.
    // Return here — Wormhole handles the Stellar minting.

    return {
      sourceTxHash: burnReceipt.hash,
      sourceLockId: safeParams.hashlock,
      bridgeTxId: messageHash,
      provider: 'cctp',
    };
  }

  // ── Outbound: Stellar → EVM Chain ────────────────────────────────────────────

  async bridgeFromStellar(params: BridgeOutParams): Promise<BridgeOutResult> {
    const safeParams = this.normalizeBridgeOutParams(params);

    const config = this.getChainConfig(safeParams.toChain);
    const provider = this.getProvider(safeParams.toChain);
    const signer = this.relayWallet.connect(provider);

    this.logger.log(
      `CCTP bridgeFromStellar: stellar → ${safeParams.toChain} | amount: ${safeParams.amount}`,
    );

    // Step 1: On Stellar, burn USDC (Soroban contract handles this)
    // Step 2: Fetch attestation from Circle
    // Step 3: Submit attestation to destination chain → USDC minted to recipient

    // At this point the Soroban Settlement Contract has already:
    //   1. Received USDC from the path payment
    //   2. Called Circle's Stellar TokenMessenger to burn USDC
    //   3. Emitted a messageHash we can use to poll

    // Here we receive the messageHash from the Soroban event and complete on EVM.
    // The Stellar tx hash is our starting point to find the message.
    const messageHash = this.getStellarBurnMessageHash(
      safeParams.stellarTxHash,
    );

    this.logger.log(`Polling CCTP attestation for messageHash: ${messageHash}`);
    const { message, attestation } =
      await this.pollAttestationFull(messageHash);

    // Submit to destination chain MessageTransmitter
    const messageTransmitter = new ethers.Contract(
      config.messageTransmitter,
      MESSAGE_TRANSMITTER_ABI,
      signer,
    );

    const receiveTx = (await messageTransmitter.receiveMessage(
      message,
      attestation,
    )) as TxResponseLike;
    const receipt = (await receiveTx.wait(1)) as TxReceiptLike;

    this.logger.log(
      `CCTP mint confirmed on ${safeParams.toChain}. TxHash: ${receipt.hash}`,
    );

    return {
      destTxHash: receipt.hash,
      bridgeTxId: messageHash,
      provider: 'cctp',
    };
  }

  // ── Complete EVM HTLC (after secret is revealed on Stellar) ──────────────────

  async completeEvmHtlc(
    params: CompleteSourceLockParams,
  ): Promise<{ txHash: string }> {
    const safeParams = this.normalizeCompleteSourceLockParams(params);

    const provider = this.getProvider(safeParams.chain);
    const signer = this.relayWallet.connect(provider);

    const htlcAddress =
      process.env[`HTLC_ADDRESS_${safeParams.chain.toUpperCase()}`];
    if (!htlcAddress)
      throw new Error(`No HTLC address configured for ${safeParams.chain}`);

    const htlc = new ethers.Contract(htlcAddress, HTLC_ABI, signer);

    this.logger.log(
      `Completing EVM HTLC on ${safeParams.chain}. lockId: ${safeParams.lockId}`,
    );

    // preimage comes in as hex string — convert to bytes32
    const preimageBytes = ethers.zeroPadValue(
      ethers.hexlify(ethers.toUtf8Bytes(safeParams.preimage)),
      32,
    );

    const tx = (await htlc.withdraw(
      safeParams.lockId,
      preimageBytes,
    )) as TxResponseLike;
    const receipt = (await tx.wait(1)) as TxReceiptLike;

    this.logger.log(`EVM HTLC completed. TxHash: ${receipt.hash}`);

    return { txHash: receipt.hash };
  }

  // ── Internal Helpers ─────────────────────────────────────────────────────────

  private normalizeBridgeInParams(params: BridgeInParams): {
    fromChain: SupportedChain;
    amount: bigint;
    hashlock: string;
  } {
    if (!CctpService.isRecord(params)) {
      throw new Error('Invalid bridge params');
    }

    const { fromChain, amount, hashlock } = params;
    if (typeof fromChain !== 'string') {
      throw new Error('Invalid bridge params: fromChain is required');
    }
    if (!this.isSupportedChain(fromChain)) {
      throw new Error(`CCTP not supported on chain: ${fromChain}`);
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

    return {
      fromChain,
      amount: typeof amount === 'bigint' ? amount : BigInt(amount),
      hashlock,
    };
  }

  private normalizeBridgeOutParams(params: BridgeOutParams): {
    toChain: SupportedChain;
    amount: bigint;
    stellarTxHash: string;
  } {
    if (!CctpService.isRecord(params)) {
      throw new Error('Invalid bridge out params');
    }

    const { toChain, amount, stellarTxHash } = params;
    if (typeof toChain !== 'string') {
      throw new Error('Invalid bridge out params: toChain is required');
    }
    if (!this.isSupportedChain(toChain)) {
      throw new Error(`CCTP not supported on chain: ${toChain}`);
    }
    if (
      typeof amount !== 'bigint' &&
      typeof amount !== 'number' &&
      typeof amount !== 'string'
    ) {
      throw new Error('Invalid bridge out params: amount is required');
    }
    if (typeof stellarTxHash !== 'string' || stellarTxHash.length === 0) {
      throw new Error('Invalid bridge out params: stellarTxHash is required');
    }

    return {
      toChain,
      amount: typeof amount === 'bigint' ? amount : BigInt(amount),
      stellarTxHash,
    };
  }

  private normalizeCompleteSourceLockParams(params: CompleteSourceLockParams): {
    chain: SupportedChain;
    lockId: string;
    preimage: string;
  } {
    if (!CctpService.isRecord(params)) {
      throw new Error('Invalid complete HTLC params');
    }

    const { chain, lockId, preimage } = params;
    if (typeof chain !== 'string') {
      throw new Error('Invalid complete HTLC params: chain is required');
    }
    if (!this.isSupportedChain(chain)) {
      throw new Error(`CCTP not supported on chain: ${chain}`);
    }
    if (typeof lockId !== 'string' || lockId.length === 0) {
      throw new Error('Invalid complete HTLC params: lockId is required');
    }
    if (typeof preimage !== 'string') {
      throw new Error('Invalid complete HTLC params: preimage is required');
    }

    return {
      chain,
      lockId,
      preimage,
    };
  }

  private async pollAttestation(messageHash: string): Promise<string> {
    const { attestation } = await this.pollAttestationFull(messageHash);
    return attestation;
  }

  private async pollAttestationFull(
    messageHash: string,
  ): Promise<{ message: string; attestation: string }> {
    const baseUrl = this.isTestnet
      ? ATTESTATION_API.testnet
      : ATTESTATION_API.mainnet;
    const url = `${baseUrl}/${messageHash}`;
    const maxRetries = 30; // 30 × 5s = 2.5 minutes max wait
    const intervalMs = 5_000;

    for (let i = 0; i < maxRetries; i++) {
      this.logger.debug(
        `Polling attestation (attempt ${i + 1}/${maxRetries})...`,
      );

      const res = await fetch(url);
      const json = (await res.json()) as {
        status: string;
        message?: string;
        attestation?: string;
      };

      if (json.status === 'complete' && json.attestation && json.message) {
        this.logger.log('CCTP attestation ready.');
        return { message: json.message, attestation: json.attestation };
      }

      if (json.status === 'pending_confirmations') {
        this.logger.debug('Attestation pending confirmations...');
      }

      await this.sleep(intervalMs);
    }

    throw new Error(`CCTP attestation timeout for messageHash: ${messageHash}`);
  }

  private getStellarBurnMessageHash(stellarTxHash: string): string {
    // In a real implementation, parse the Stellar transaction to find the
    // CCTP MessageSent event emitted by the Soroban contract.
    // This returns the keccak256 hash of the CCTP message bytes.
    //
    // Placeholder — implement with Stellar Horizon API:
    // GET /transactions/:hash/operations → find the CCTP burn operation
    // Extract the message bytes from the Soroban contract event
    // Return ethers.keccak256(messageBytes)
    throw new Error(
      `getStellarBurnMessageHash not yet implemented. stellarTxHash: ${stellarTxHash}`,
    );
  }

  private isSupportedChain(chain: string): chain is SupportedChain {
    return chain in CHAIN_CONFIG;
  }

  private getProvider(chain: SupportedChain): ethers.JsonRpcProvider {
    const config = this.getChainConfig(chain);
    const rpcUrl = process.env[config.rpcEnvKey];
    if (!rpcUrl)
      throw new Error(
        `No RPC URL configured for chain: ${chain} (env: ${config.rpcEnvKey})`,
      );
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  private getChainConfig(chain: SupportedChain): ChainConfig {
    const config = CHAIN_CONFIG[chain];
    if (!config) throw new Error(`CCTP not supported on chain: ${chain}`);
    return config;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}
