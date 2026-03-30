import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarContractEvent } from '@tavvio/types';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);

  // We'll use a real stream in the full implementation
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
