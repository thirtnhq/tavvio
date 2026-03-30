import { Injectable, Logger, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarContractEvent } from '@tavvio/types';
import { Decimal } from '@prisma/client/runtime/library';

interface PathPaymentPath {
  sourceAsset: {
    native?: boolean;
    code?: string;
    issuer?: string;
  };
  destinationAsset: {
    native?: boolean;
    code?: string;
    issuer?: string;
  };
  path: Array<{
    native?: boolean;
    code?: string;
    issuer?: string;
  }>;
  destinationAmount: string;
}

interface StrictSendPathResult {
  paths: PathPaymentPath[];
  destinationAmount: string;
}

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: StellarSdk.rpc.Server;

  constructor() {
    // Use testnet for development, switch to mainnet for production
    const isProduction = process.env.STELLAR_NETWORK === 'mainnet';
    const network = isProduction
      ? StellarSdk.Networks.PUBLIC_NETWORK_PASSPHRASE
      : StellarSdk.Networks.TESTNET_NETWORK_PASSPHRASE;
    const serverUrl = isProduction
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';

    this.server = new StellarSdk.rpc.Server(serverUrl);
  }

  /**
   * Find strict send paths for a payment
   * Returns the best path(s) that will send exactly the specified source amount
   * and receive the maximum destination amount
   */
  async findStrictSendPaths(params: {
    sourceAsset: string; // "native" or "CODE:issuer"
    sourceAmount: string; // decimal string
    destinationAssets: string[]; // array of "native" or "CODE:issuer"
    destinationAccount?: string; // optional account for path finding context
  }): Promise<StrictSendPathResult> {
    try {
      this.logger.debug(`Finding strict send paths for ${params.sourceAmount} ${params.sourceAsset}`);

      // Parse source and destination assets
      const sourceAsset = this.parseAsset(params.sourceAsset);
      const destAssets = params.destinationAssets.map((asset) =>
        this.parseAsset(asset),
      );

      // Use Stellar SDK to find strict send paths
      const request = this.server.strictSendPaths({
        sourceAsset: sourceAsset as StellarSdk.Asset,
        sourceAmount: params.sourceAmount,
        destinationAssets: destAssets as StellarSdk.Asset[],
      });

      const response = (await request.call()) as StrictSendPathResult;

      if (!response.paths || response.paths.length === 0) {
        throw new BadRequestException(
          `No liquidity found for ${params.sourceAmount} ${params.sourceAsset}`,
        );
      }

      this.logger.debug(
        `Found ${response.paths.length} paths, best destination amount: ${response.destinationAmount}`,
      );

      return response;
    } catch (error) {
      this.logger.error('Error finding strict send paths:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to find path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse a Stellar asset string into an Asset object
   * Format: "native" or "CODE:issuer"
   */
  private parseAsset(assetString: string): StellarSdk.Asset {
    if (assetString === 'native') {
      return StellarSdk.Asset.native();
    }
    const [code, issuer] = assetString.split(':');
    if (!code || !issuer) {
      throw new BadRequestException(
        `Invalid asset format: ${assetString}. Expected "native" or "CODE:issuer"`,
      );
    }
    return new StellarSdk.Asset(code, issuer);
  }
  streamContractEvents(
    contractId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onEvent: (event: StellarContractEvent) => void | Promise<void>,
  ) {
    this.logger.log(`Starting soroban event stream for ${contractId}`);
    // This would typically use StellarSdk.rpc.Server.getEvents
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async lockHTLC(params: {
    sender: string;
    receiver: string;
    token: string;
    amount: bigint;
    hashlock: string;
    timelock: number;
  }): Promise<string> {
    this.logger.log(`Locking HTLC on Stellar: ${params.amount} units`);
    // Placeholder for Soroban invocation
    return 'stellar_lock_tx_hash';
  }

  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async withdrawHTLC(lockId: string, preimage: string): Promise<string> {
    this.logger.log(`Withdrawing HTLC on Stellar with lockId: ${lockId}`);
    // Placeholder for Soroban invocation
    return 'stellar_withdraw_tx_hash';
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async refundHTLC(lockId: string): Promise<string> {
    this.logger.log(`Refunding HTLC on Stellar with lockId: ${lockId}`);
    // Placeholder for Soroban invocation
    return 'stellar_refund_tx_hash';
  }

  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async executePathPayment(params: unknown): Promise<string> {
    this.logger.log(`Executing Stellar path payment`);
    return 'stellar_path_payment_tx_hash';
  }
}
