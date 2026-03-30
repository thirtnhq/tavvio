import { Injectable } from '@nestjs/common';
import {
  BridgeInParams,
  BridgeInResult,
  BridgeOutParams,
  BridgeOutResult,
  Chain,
  CompleteSourceLockParams,
} from '@tavvio/types';
import { WormholeService } from './providers/wormhole.service';
import { LayerswapService } from './providers/layerswap.service';
import { CctpService } from './providers/cctp.service';

// Chains supported by Circle CCTP natively
const CCTP_CHAINS = new Set([
  'ethereum',
  'base',
  'avalanche',
  'arbitrum',
  'polygon',
]);

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

@Injectable()
export class BridgeRouterService {
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  constructor(
    private readonly cctp: CctpService,
    private readonly wormhole: WormholeService,
    private readonly layerswap: LayerswapService,
  ) {}

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

  // eslint-disable-next-line @typescript-eslint/require-await -- stub until EVM HTLC contract integration
  async completeSourceLock(params: CompleteSourceLockParams): Promise<string> {
    const { chain, lockId } = params;
    // TODO: call withdraw() on the EVM HTLC contract for the specific chain
    return `tx_hash_for_unlocking_${lockId}_on_${chain}`;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- stub until EVM HTLC contract integration
  async refundSourceLock(params: {
    chain: Chain;
    lockId: string;
  }): Promise<string> {
    const { chain, lockId } = params;
    // TODO: call refund() on EVM HTLC contract
    return `tx_hash_for_refunding_${lockId}_on_${chain}`;
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
