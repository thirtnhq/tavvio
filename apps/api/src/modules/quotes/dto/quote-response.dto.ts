export class QuoteResponseDto {
  /**
   * Unique quote ID
   */
  id!: string;

  /**
   * Source chain
   */
  fromChain!: string;

  /**
   * Source asset symbol
   */
  fromAsset!: string;

  /**
   * Source amount (requested)
   */
  fromAmount!: string;

  /**
   * Destination chain
   */
  toChain!: string;

  /**
   * Destination asset symbol
   */
  toAsset!: string;

  /**
   * Net amount merchant receives (after fees)
   */
  toAmount!: string;

  /**
   * Exchange rate (destination / source)
   */
  rate!: string;

  /**
   * Fee amount in destination asset
   */
  fee!: string;

  /**
   * Fee in basis points (0-10000)
   */
  feeBps!: number;

  /**
   * Bridge provider: "cctp", "wormhole", "layerswap", or null for native
   */
  bridgeProvider!: string | null;

  /**
   * Estimated time for cross-chain settlement in milliseconds
   */
  estimatedTimeMs!: number;

  /**
   * When this quote expires (ISO 8601 timestamp)
   */
  expiresAt!: string;

  /**
   * Seconds until quote expires
   */
  expiresInSeconds!: number;
}
