import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BridgeInParams,
  BridgeInResult,
  BridgeOutParams,
  BridgeOutResult,
  Chain,
  CompleteSourceLockParams,
} from '@useroutr/types';
import { ethers } from 'ethers';
import { WormholeService } from './providers/wormhole.service';
import { LayerswapService } from './providers/layerswap.service';
import { CctpService } from './providers/cctp.service';

// ── EVM HTLC contract ABI (withdraw + refund only) ─────────────────────────
const HTLC_ABI = [
  'function withdraw(bytes32 lockId, bytes32 preimage) external returns (bool)',
  'function refund(bytes32 lockId) external returns (bool)',
  'event Withdrawn(bytes32 indexed lockId, bytes32 preimage)',
  'event Refunded(bytes32 indexed lockId)',
] as const;

// ── Chains supported by Circle CCTP natively ────────────────────────────────
const CCTP_CHAINS = new Set<string>([
  'ethereum',
  'base',
  'avalanche',
  'arbitrum',
  'polygon',
]);

// ── EVM chains we support for HTLC settlement ──────────────────────────────
const EVM_CHAINS: Chain[] = [
  'ethereum',
  'base',
  'polygon',
  'arbitrum',
  'avalanche',
];

/** Per-chain provider + contract instances, created once on startup. */
interface EvmChainHandle {
  chain: Chain;
  provider: ethers.JsonRpcProvider;
  signer: ethers.Wallet;
  htlc: ethers.Contract;
}

type RouteProvider = 'stellar_native' | 'layerswap' | 'cctp' | 'wormhole';

interface RouteDecision {
  fromChain: string;
  toChain: string;
  asset: string;
  provider: RouteProvider;
  estimatedTimeMs: number;
  estimatedFeeBps: number;
}

interface BridgeInProvider {
  bridgeToStellar(params: unknown): Promise<BridgeInResult>;
}

interface BridgeOutProvider {
  bridgeFromStellar(params: unknown): Promise<BridgeOutResult>;
}

/** Maximum number of blocks to wait for a tx receipt before timing out. */
const TX_CONFIRMATION_BLOCKS = 2;

@Injectable()
export class BridgeRouterService implements OnModuleInit {
  private readonly logger = new Logger(BridgeRouterService.name);

  /** Lazily-initialised per-chain handles (RPC + signer + contract). */
  private readonly handles = new Map<Chain, EvmChainHandle>();

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  constructor(
    private readonly config: ConfigService,
    private readonly cctp: CctpService,
    private readonly wormhole: WormholeService,
    private readonly layerswap: LayerswapService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onModuleInit(): void {
    const relayKey = this.config.get<string>('EVM_RELAY_PRIVATE_KEY', '');
    if (!relayKey || relayKey === '0x...') {
      this.logger.warn(
        'EVM_RELAY_PRIVATE_KEY not configured — EVM HTLC withdraw/refund will fail',
      );
      return;
    }

    for (const chain of EVM_CHAINS) {
      const rpcUrl = this.config.get<string>(`RPC_${chain.toUpperCase()}`);
      const htlcAddress = this.config.get<string>(
        `HTLC_ADDRESS_${chain.toUpperCase()}`,
      );

      if (!rpcUrl || !htlcAddress || htlcAddress === '0x...') {
        this.logger.debug(
          `Skipping ${chain}: RPC or HTLC address not configured`,
        );
        continue;
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(relayKey, provider);
      const htlc = new ethers.Contract(htlcAddress, HTLC_ABI, signer);

      this.handles.set(chain, { chain, provider, signer, htlc });
      this.logger.log(
        `EVM handle ready: ${chain} → ${htlcAddress.slice(0, 10)}…`,
      );
    }
  }

  findRoute(from: string, to: string, asset: string): RouteDecision {
    // Stellar-native: no bridge needed
    if (from === 'stellar' && to === 'stellar') {
      return {
        fromChain: from,
        toChain: to,
        asset,
        provider: 'stellar_native',
        estimatedTimeMs: 5000,
        estimatedFeeBps: 0,
      };
    }
    // Starknet: Layerswap
    if (from === 'starknet' || to === 'starknet') {
      return {
        fromChain: from,
        toChain: to,
        asset,
        provider: 'layerswap',
        estimatedTimeMs: 120_000,
        estimatedFeeBps: 10,
      };
    }
    // CCTP-supported chains: faster and native USDC
    if (
      (CCTP_CHAINS.has(from) || from === 'stellar') &&
      (CCTP_CHAINS.has(to) || to === 'stellar') &&
      asset === 'USDC'
    ) {
      return {
        fromChain: from,
        toChain: to,
        asset,
        provider: 'cctp',
        estimatedTimeMs: 30_000,
        estimatedFeeBps: 0,
      };
    }
    // Default: Wormhole
    return {
      fromChain: from,
      toChain: to,
      asset,
      provider: 'wormhole',
      estimatedTimeMs: 60_000,
      estimatedFeeBps: 5,
    };
  }

  async bridgeIn(params: BridgeInParams): Promise<BridgeInResult> {
    const safeParams = this.normalizeBridgeInParams(params);
    const route = this.findRoute(
      safeParams.fromChain,
      'stellar',
      safeParams.asset,
    );
    switch (route.provider) {
      case 'cctp':
        return this.cctp.bridgeToStellar(params);
      case 'wormhole':
        return this.callBridgeIn(this.wormhole, params);
      case 'layerswap':
        return this.callBridgeIn(this.layerswap, params);
      default:
        throw new Error('Unknown provider');
    }
  }

  async bridgeOut(params: BridgeOutParams): Promise<BridgeOutResult> {
    const safeParams = this.normalizeBridgeOutParams(params);
    const route = this.findRoute(
      'stellar',
      safeParams.toChain,
      safeParams.asset,
    );
    switch (route.provider) {
      case 'cctp':
        return this.cctp.bridgeFromStellar(params);
      case 'wormhole':
        return this.callBridgeOut(this.wormhole, params);
      case 'layerswap':
        return this.callBridgeOut(this.layerswap, params);
      case 'stellar_native':
        return this.stellarDirectTransfer(params);
      default:
        throw new Error('Unknown provider');
    }
  }

  /**
   * Calls withdraw(lockId, preimage) on the source chain's HTLC contract.
   * This releases the payer's locked funds to the relay/merchant after the
   * secret has been revealed on Stellar.
   */
  async completeSourceLock(params: CompleteSourceLockParams): Promise<string> {
    const { chain, lockId, preimage } = params;
    const handle = this.getHandle(chain);

    this.logger.log(
      `Withdrawing HTLC lock ${lockId} on ${chain} with preimage`,
    );

    const tx = (await handle.htlc.withdraw(
      lockId,
      preimage,
    )) as ethers.TransactionResponse;

    const receipt = await tx.wait(TX_CONFIRMATION_BLOCKS);
    if (!receipt || receipt.status !== 1) {
      throw new Error(`HTLC withdraw tx reverted on ${chain}: ${tx.hash}`);
    }

    this.logger.log(`HTLC withdraw confirmed on ${chain}: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Calls refund(lockId) on the source chain's HTLC contract.
   * This returns locked funds to the original sender after the timelock expires.
   */
  async refundSourceLock(params: {
    chain: Chain;
    lockId: string;
  }): Promise<string> {
    const { chain, lockId } = params;
    const handle = this.getHandle(chain);

    this.logger.log(`Refunding HTLC lock ${lockId} on ${chain}`);

    const tx = (await handle.htlc.refund(lockId)) as ethers.TransactionResponse;

    const receipt = await tx.wait(TX_CONFIRMATION_BLOCKS);
    if (!receipt || receipt.status !== 1) {
      throw new Error(`HTLC refund tx reverted on ${chain}: ${tx.hash}`);
    }

    this.logger.log(`HTLC refund confirmed on ${chain}: ${receipt.hash}`);
    return receipt.hash;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Returns the pre-initialised handle for a chain, or throws. */
  private getHandle(chain: Chain): EvmChainHandle {
    const handle = this.handles.get(chain);
    if (!handle) {
      throw new Error(
        `No EVM handle configured for chain "${chain}". ` +
          `Check RPC_${chain.toUpperCase()} and HTLC_ADDRESS_${chain.toUpperCase()} env vars.`,
      );
    }
    return handle;
  }

  private stellarDirectTransfer(params: BridgeOutParams): BridgeOutResult {
    void params;
    // Direct Stellar path payment — no bridge needed
    // Handled by StellarService
    return {
      destTxHash: 'handled_by_stellar_service',
      bridgeTxId: 'stellar_native',
      provider: 'stellar_native',
    };
  }

  private normalizeBridgeInParams(params: BridgeInParams): {
    fromChain: string;
    asset: string;
  } {
    if (!BridgeRouterService.isRecord(params)) {
      throw new Error('Invalid bridge in params');
    }

    const { fromChain, asset } = params;
    if (typeof fromChain !== 'string') {
      throw new Error('Invalid bridge in params: fromChain is required');
    }
    if (typeof asset !== 'string' || asset.length === 0) {
      throw new Error('Invalid bridge in params: asset is required');
    }

    return {
      fromChain,
      asset,
    };
  }

  private normalizeBridgeOutParams(params: BridgeOutParams): {
    toChain: string;
    asset: string;
  } {
    if (!BridgeRouterService.isRecord(params)) {
      throw new Error('Invalid bridge out params');
    }

    const { toChain, asset } = params;
    if (typeof toChain !== 'string') {
      throw new Error('Invalid bridge out params: toChain is required');
    }
    if (typeof asset !== 'string' || asset.length === 0) {
      throw new Error('Invalid bridge out params: asset is required');
    }

    return {
      toChain,
      asset,
    };
  }

  private callBridgeIn(
    provider: unknown,
    params: BridgeInParams,
  ): Promise<BridgeInResult> {
    const bridgeProvider = provider as BridgeInProvider;
    return bridgeProvider.bridgeToStellar(params as unknown);
  }

  private callBridgeOut(
    provider: unknown,
    params: BridgeOutParams,
  ): Promise<BridgeOutResult> {
    const bridgeProvider = provider as BridgeOutProvider;
    return bridgeProvider.bridgeFromStellar(params as unknown);
  }
}
