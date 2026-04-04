export type Chain =
  | 'stellar'
  | 'ethereum'
  | 'base'
  | 'bnb'
  | 'polygon'
  | 'arbitrum'
  | 'avalanche'
  | 'solana'
  | 'starknet';

  export interface AddressDetectionResult {
  possibleChains: Chain[];
  format:         "evm" | "stellar" | "solana" | "starknet" | "unknown";
  requiresChainSelection: boolean;
}


export type BridgeProvider = 'cctp' | 'wormhole' | 'layerswap' | 'stellar_native';

export interface BridgeRoute {
  provider:          BridgeProvider;
  fromChain:         Chain;
  toChain:           Chain;
  asset:             string;
  estimatedTimeMs:   number;
  estimatedFeeBps:   number;
  estimatedFeeUsd?:  number;
}

// ── Inbound (payer chain → Stellar) ──────────────────────────────────────────

export interface BridgeInParams {
  fromChain:       Chain;
  asset:           string;           // token symbol e.g. "USDC"
  amount:          bigint;           // in smallest unit (wei / stroops)
  senderAddress:   string;           // payer's address on source chain
  hashlock:        string;           // 0x-prefixed sha256 of HTLC secret
  timelockSeconds: number;           // how many seconds until HTLC expires
  paymentId:       string;           // Useroutr payment ID for tracking
}

export interface BridgeInResult {
  sourceTxHash:  string;
  sourceLockId:  string;             // HTLC lock ID on source chain
  bridgeTxId?:   string;            // bridge-specific tracking ID
  provider:      BridgeProvider;
}

// ── Outbound (Stellar → merchant chain) ──────────────────────────────────────

export interface BridgeOutParams {
  toChain:          Chain;
  asset:            string;
  amount:           bigint;
  recipientAddress: string;          // merchant's address on dest chain
  stellarTxHash:    string;          // the Stellar settlement tx
  paymentId:        string;
}

export interface BridgeOutResult {
  destTxHash: string;
  bridgeTxId?: string;
  provider:   BridgeProvider;
}

// ── Complete source HTLC (after secret is revealed) ──────────────────────────

export interface CompleteSourceLockParams {
  chain:    Chain;
  lockId:   string;
  preimage: string;                  // the revealed secret (hex)
}

export type StellarContractEventType = 'Locked' | 'Withdrawn' | 'Refunded' | 'Settled' | 'Confirmed';

export interface StellarContractEvent {
  type: StellarContractEventType;
  lock_id: string;
  preimage: string;
}

export interface SourceLockEvent {
  lockId:   string;
  sender:   string;
  receiver: string;
  amount:   bigint;
  hashlock: string;
  timelock: number;
  token:    string;
  chain:    Chain;
}