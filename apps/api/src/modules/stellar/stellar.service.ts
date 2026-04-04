import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarContractEvent } from '@useroutr/types';

// ── Interfaces ───────────────────────────────────────────────────────────────

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

export interface LockEntry {
  sender: string;
  receiver: string;
  token: string;
  amount: bigint;
  hashlock: string;
  timelock: number;
  withdrawn: boolean;
  refunded: boolean;
}

export interface SettlementInfo {
  sourceAsset: string;
  sourceAmount: bigint;
  destAsset: string;
  destAmount: bigint;
  merchant: string;
  merchantAmount: bigint;
  feeAmount: bigint;
  hashlock: string;
  timelock: number;
  htlcLockId: string;
  confirmed: boolean;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class StellarService implements OnModuleDestroy {
  private readonly logger = new Logger(StellarService.name);

  private readonly horizonServer: StellarSdk.Horizon.Server;
  private readonly sorobanServer: StellarSdk.rpc.Server;
  private readonly relayKeypair: StellarSdk.Keypair | null;
  private readonly networkPassphrase: string;

  private readonly htlcContractId: string;
  private readonly feeCollectorContractId: string;
  private readonly settlementContractId: string;

  private readonly eventStopFns: Array<() => void> = [];

  constructor() {
    const network =
      (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const isMainnet = network === 'mainnet';

    this.networkPassphrase = isMainnet
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

    this.horizonServer = new StellarSdk.Horizon.Server(
      process.env.STELLAR_HORIZON_URL ||
        (isMainnet
          ? 'https://horizon.stellar.org'
          : 'https://horizon-testnet.stellar.org'),
    );

    this.sorobanServer = new StellarSdk.rpc.Server(
      process.env.STELLAR_SOROBAN_RPC_URL ||
        'https://soroban-testnet.stellar.org',
    );

    const secret = process.env.STELLAR_RELAY_KEYPAIR_SECRET;
    this.relayKeypair = secret ? StellarSdk.Keypair.fromSecret(secret) : null;

    this.htlcContractId = process.env.SOROBAN_HTLC_CONTRACT_ID || '';
    this.feeCollectorContractId =
      process.env.SOROBAN_FEE_COLLECTOR_CONTRACT_ID || '';
    this.settlementContractId =
      process.env.SOROBAN_SETTLEMENT_CONTRACT_ID || '';
  }

  onModuleDestroy() {
    for (const stop of this.eventStopFns) stop();
  }

  // ── Account management ─────────────────────────────────────────────────────

  createAccount(): { publicKey: string; secret: string } {
    const keypair = StellarSdk.Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secret: keypair.secret(),
    };
  }

  async getAccount(
    publicKey: string,
  ): Promise<StellarSdk.Horizon.AccountResponse> {
    return await this.horizonServer.loadAccount(publicKey);
  }

  async fundTestnetAccount(publicKey: string): Promise<void> {
    if (this.networkPassphrase !== (StellarSdk.Networks.TESTNET as string)) {
      throw new BadRequestException('Friendbot is only available on testnet');
    }
    const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
    await fetch(url);
    this.logger.log(`Funded testnet account ${publicKey}`);
  }

  // ── Path payments ──────────────────────────────────────────────────────────

  async findStrictSendPaths(params: {
    sourceAsset: string;
    sourceAmount: string;
    destinationAssets: string[];
    destinationAccount?: string;
  }): Promise<StrictSendPathResult> {
    try {
      this.logger.debug(
        `Finding strict send paths for ${params.sourceAmount} ${params.sourceAsset}`,
      );

      const sourceAsset = this.parseAsset(params.sourceAsset);
      const destAssets = params.destinationAssets.map((a) =>
        this.parseAsset(a),
      );

      const response = await this.horizonServer
        .strictSendPaths(sourceAsset, params.sourceAmount, destAssets)
        .call();

      if (!response.records || response.records.length === 0) {
        throw new BadRequestException(
          `No liquidity found for ${params.sourceAmount} ${params.sourceAsset}`,
        );
      }

      const paths = this.mapPathRecords(response.records);
      const bestPath = paths[0];
      this.logger.debug(
        `Found ${paths.length} paths, best destination amount: ${bestPath.destinationAmount}`,
      );

      return { paths, destinationAmount: bestPath.destinationAmount };
    } catch (error) {
      this.logger.error('Error finding strict send paths:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Failed to find path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findStrictReceivePaths(params: {
    sourceAssets: string[];
    destinationAsset: string;
    destinationAmount: string;
  }): Promise<StrictSendPathResult> {
    try {
      const srcAssets = params.sourceAssets.map((a) => this.parseAsset(a));
      const destAsset = this.parseAsset(params.destinationAsset);

      const response = await this.horizonServer
        .strictReceivePaths(srcAssets, destAsset, params.destinationAmount)
        .call();

      if (!response.records || response.records.length === 0) {
        throw new BadRequestException(
          `No liquidity found for ${params.destinationAmount} ${params.destinationAsset}`,
        );
      }

      const paths = this.mapPathRecords(response.records);
      return { paths, destinationAmount: paths[0].destinationAmount };
    } catch (error) {
      this.logger.error('Error finding strict receive paths:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Failed to find path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async executePathPayment(params: {
    sourceAsset: string;
    sourceAmount: string;
    destinationAsset: string;
    destinationMinAmount: string;
    destinationAccount: string;
    path: string[];
  }): Promise<string> {
    this.logger.log('Executing Stellar path payment');

    const keypair = this.requireKeypair();
    const account = await this.horizonServer.loadAccount(keypair.publicKey());

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset: this.parseAsset(params.sourceAsset),
          sendAmount: params.sourceAmount,
          destination: params.destinationAccount,
          destAsset: this.parseAsset(params.destinationAsset),
          destMin: params.destinationMinAmount,
          path: params.path.map((a) => this.parseAsset(a)),
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await this.horizonServer.submitTransaction(tx);
    return result.hash;
  }

  // ── HTLC interactions ──────────────────────────────────────────────────────

  async lockHTLC(params: {
    sender: string;
    receiver: string;
    token: string;
    amount: bigint;
    hashlock: string;
    timelock: number;
  }): Promise<string> {
    this.logger.log(`Locking HTLC on Stellar: ${params.amount} units`);

    const args = [
      new StellarSdk.Address(params.sender).toScVal(),
      new StellarSdk.Address(params.receiver).toScVal(),
      new StellarSdk.Address(params.token).toScVal(),
      StellarSdk.nativeToScVal(params.amount, { type: 'i128' }),
      StellarSdk.nativeToScVal(Buffer.from(params.hashlock, 'hex'), {
        type: 'bytes',
      }),
      StellarSdk.nativeToScVal(params.timelock, { type: 'u64' }),
    ];

    const result = await this.invokeSorobanContract(
      this.htlcContractId,
      'lock',
      args,
    );

    const lockId = this.extractReturnValue(result);
    this.logger.log(`HTLC locked with ID: ${lockId}`);
    return lockId;
  }

  async withdrawHTLC(lockId: string, preimage: string): Promise<string> {
    this.logger.log(`Withdrawing HTLC on Stellar with lockId: ${lockId}`);

    const args = [
      StellarSdk.nativeToScVal(Buffer.from(lockId, 'hex'), { type: 'bytes' }),
      StellarSdk.nativeToScVal(Buffer.from(preimage, 'hex'), {
        type: 'bytes',
      }),
    ];

    const result = await this.invokeSorobanContract(
      this.htlcContractId,
      'withdraw',
      args,
    );

    return this.extractTxHash(result);
  }

  async refundHTLC(lockId: string): Promise<string> {
    this.logger.log(`Refunding HTLC on Stellar with lockId: ${lockId}`);

    const args = [
      StellarSdk.nativeToScVal(Buffer.from(lockId, 'hex'), { type: 'bytes' }),
    ];

    const result = await this.invokeSorobanContract(
      this.htlcContractId,
      'refund',
      args,
    );

    return this.extractTxHash(result);
  }

  async getLock(lockId: string): Promise<LockEntry> {
    this.logger.debug(`Fetching HTLC lock: ${lockId}`);

    const args = [
      StellarSdk.nativeToScVal(Buffer.from(lockId, 'hex'), { type: 'bytes' }),
    ];

    const result = await this.invokeSorobanContract(
      this.htlcContractId,
      'get_lock',
      args,
    );

    const success =
      result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    if (!success.returnValue) {
      throw new BadRequestException('Lock not found');
    }

    // Soroban structs are returned as ScVal maps
    const native = StellarSdk.scValToNative(success.returnValue) as Record<
      string,
      unknown
    >;
    return {
      sender: String(native.sender),
      receiver: String(native.receiver),
      token: String(native.token),
      amount: BigInt(native.amount as string | number | bigint),
      hashlock: Buffer.from(native.hashlock as Uint8Array).toString('hex'),
      timelock: Number(native.timelock),
      withdrawn: Boolean(native.withdrawn),
      refunded: Boolean(native.refunded),
    };
  }

  // ── Settlement ─────────────────────────────────────────────────────────────

  /**
   * Phase 1: Execute settlement — fee deduction + transfer merchant_amount to relay.
   * The relay must have deposited `destAmount` into the settlement contract first.
   */
  async settle(params: {
    sourceAsset: string;
    sourceAmount: bigint;
    destAsset: string;
    destAmount: bigint;
    merchant: string;
    hashlock: string;
    timelock: number;
  }): Promise<{ merchantAmount: bigint; feeAmount: bigint }> {
    this.logger.log(
      `Settling: ${params.destAmount} units for merchant ${params.merchant}`,
    );

    const relayPublicKey = this.requireKeypair().publicKey();

    const args = [
      new StellarSdk.Address(relayPublicKey).toScVal(),
      new StellarSdk.Address(params.sourceAsset).toScVal(),
      StellarSdk.nativeToScVal(params.sourceAmount, { type: 'i128' }),
      new StellarSdk.Address(params.destAsset).toScVal(),
      StellarSdk.nativeToScVal(params.destAmount, { type: 'i128' }),
      new StellarSdk.Address(params.merchant).toScVal(),
      StellarSdk.nativeToScVal(Buffer.from(params.hashlock, 'hex'), {
        type: 'bytes',
      }),
      StellarSdk.nativeToScVal(params.timelock, { type: 'u64' }),
    ];

    const result = await this.invokeSorobanContract(
      this.settlementContractId,
      'settle',
      args,
    );

    const success =
      result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    if (!success.returnValue) {
      throw new Error('Settlement returned no value');
    }

    const [merchantAmount, feeAmount] = StellarSdk.scValToNative(
      success.returnValue,
    ) as [bigint, bigint];

    this.logger.log(
      `Settlement complete: merchant=${merchantAmount}, fee=${feeAmount}`,
    );
    return { merchantAmount, feeAmount };
  }

  /**
   * Phase 2: Confirm settlement by linking the HTLC lock ID.
   * Called after the relay has locked merchant_amount in HTLC.
   */
  async confirmSettlement(
    hashlock: string,
    htlcLockId: string,
  ): Promise<string> {
    this.logger.log(
      `Confirming settlement: hashlock=${hashlock}, htlcLockId=${htlcLockId}`,
    );

    const relayPublicKey = this.requireKeypair().publicKey();

    const args = [
      new StellarSdk.Address(relayPublicKey).toScVal(),
      StellarSdk.nativeToScVal(Buffer.from(hashlock, 'hex'), {
        type: 'bytes',
      }),
      StellarSdk.nativeToScVal(Buffer.from(htlcLockId, 'hex'), {
        type: 'bytes',
      }),
    ];

    const result = await this.invokeSorobanContract(
      this.settlementContractId,
      'confirm',
      args,
    );

    return this.extractTxHash(result);
  }

  /**
   * Query a settlement by hashlock.
   */
  async getSettlement(hashlock: string): Promise<SettlementInfo> {
    this.logger.debug(`Fetching settlement: ${hashlock}`);

    const args = [
      StellarSdk.nativeToScVal(Buffer.from(hashlock, 'hex'), {
        type: 'bytes',
      }),
    ];

    const result = await this.invokeSorobanContract(
      this.settlementContractId,
      'get_settlement',
      args,
    );

    const success =
      result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    if (!success.returnValue) {
      throw new BadRequestException('Settlement not found');
    }

    const native = StellarSdk.scValToNative(success.returnValue) as Record<
      string,
      unknown
    >;

    return {
      sourceAsset: String(native.source_asset),
      sourceAmount: BigInt(native.source_amount as string | number | bigint),
      destAsset: String(native.dest_asset),
      destAmount: BigInt(native.dest_amount as string | number | bigint),
      merchant: String(native.merchant),
      merchantAmount: BigInt(
        native.merchant_amount as string | number | bigint,
      ),
      feeAmount: BigInt(native.fee_amount as string | number | bigint),
      hashlock: Buffer.from(native.hashlock as Uint8Array).toString('hex'),
      timelock: Number(native.timelock),
      htlcLockId: Buffer.from(native.htlc_lock_id as Uint8Array).toString(
        'hex',
      ),
      confirmed: Boolean(native.confirmed),
    };
  }

  // ── Fee collector ──────────────────────────────────────────────────────────

  async deductFee(
    token: string,
    grossAmount: bigint,
    merchant: string,
  ): Promise<{ merchantAmount: bigint; feeAmount: bigint }> {
    this.logger.log(`Deducting fee for ${grossAmount} units of ${token}`);

    const args = [
      new StellarSdk.Address(token).toScVal(),
      StellarSdk.nativeToScVal(grossAmount, { type: 'i128' }),
      new StellarSdk.Address(merchant).toScVal(),
    ];

    const result = await this.invokeSorobanContract(
      this.feeCollectorContractId,
      'deduct',
      args,
    );

    const success =
      result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    if (!success.returnValue) {
      throw new Error('Fee deduction returned no value');
    }

    const [merchantAmount, feeAmount] = StellarSdk.scValToNative(
      success.returnValue,
    ) as [bigint, bigint];

    return { merchantAmount, feeAmount };
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  streamContractEvents(
    contractId: string,
    onEvent: (event: StellarContractEvent) => void | Promise<void>,
  ): void {
    this.logger.log(`Starting Soroban event stream for ${contractId}`);

    let running = true;
    let cursor: string | undefined;

    const poll = async () => {
      while (running) {
        try {
          const filters = [
            { type: 'contract' as const, contractIds: [contractId] },
          ];
          const response = cursor
            ? await this.sorobanServer.getEvents({ filters, cursor })
            : await this.sorobanServer.getEvents({
                filters,
                startLedger: 1,
              });

          // Use the response-level cursor for pagination
          if (response.cursor) cursor = response.cursor;

          for (const event of response.events) {
            try {
              const topics = event.topic.map(
                (t: StellarSdk.xdr.ScVal): string =>
                  String(StellarSdk.scValToNative(t)),
              );
              const eventName = topics[0];

              if (
                eventName === 'Locked' ||
                eventName === 'Withdrawn' ||
                eventName === 'Refunded' ||
                eventName === 'Settled' ||
                eventName === 'Confirmed'
              ) {
                const value = StellarSdk.scValToNative(event.value) as Record<
                  string,
                  unknown
                >;
                const parsed: StellarContractEvent = {
                  type: eventName,
                  lock_id: value?.lock_id
                    ? Buffer.from(value.lock_id as Uint8Array).toString('hex')
                    : '',
                  preimage: value?.preimage
                    ? Buffer.from(value.preimage as Uint8Array).toString('hex')
                    : '',
                };

                await onEvent(parsed);
              }
            } catch (err) {
              this.logger.error(
                `Error parsing contract event: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        } catch {
          // Silently retry on transient RPC errors
        }

        await this.sleep(5000);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    poll();

    this.eventStopFns.push(() => {
      running = false;
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private requireKeypair(): StellarSdk.Keypair {
    if (!this.relayKeypair) {
      throw new Error('STELLAR_RELAY_KEYPAIR_SECRET is not configured');
    }
    return this.relayKeypair;
  }

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

  /**
   * Shared Soroban contract invocation: build → simulate → sign → submit → poll.
   */
  private async invokeSorobanContract(
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[],
  ): Promise<StellarSdk.rpc.Api.GetTransactionResponse> {
    const keypair = this.requireKeypair();
    const contract = new StellarSdk.Contract(contractId);
    const sourceAccount = await this.sorobanServer.getAccount(
      keypair.publicKey(),
    );

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.sorobanServer.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Soroban simulation failed: ${simulated.error}`);
    }

    const prepared = StellarSdk.rpc
      .assembleTransaction(
        tx,
        simulated as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse,
      )
      .build();

    prepared.sign(keypair);

    const sendResponse = await this.sorobanServer.sendTransaction(prepared);
    if (sendResponse.status === 'ERROR') {
      throw new Error(`Soroban tx send failed: ${sendResponse.status}`);
    }

    // Poll for finality
    let result = await this.sorobanServer.getTransaction(sendResponse.hash);
    while (
      result.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      await this.sleep(1000);
      result = await this.sorobanServer.getTransaction(sendResponse.hash);
    }

    if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Soroban tx failed: ${sendResponse.hash}`);
    }

    return result;
  }

  private mapPathRecords(
    records: StellarSdk.Horizon.ServerApi.PaymentPathRecord[],
  ): PathPaymentPath[] {
    return records.map((record) => ({
      sourceAsset: {
        native: record.source_asset_type === 'native',
        code: record.source_asset_code,
        issuer: record.source_asset_issuer,
      },
      destinationAsset: {
        native: record.destination_asset_type === 'native',
        code: record.destination_asset_code,
        issuer: record.destination_asset_issuer,
      },
      path: record.path.map(
        (p: {
          asset_type: string;
          asset_code?: string;
          asset_issuer?: string;
        }) => ({
          native: p.asset_type === 'native',
          code: p.asset_code,
          issuer: p.asset_issuer,
        }),
      ),
      destinationAmount: record.destination_amount,
    }));
  }

  private extractReturnValue(
    result: StellarSdk.rpc.Api.GetTransactionResponse,
  ): string {
    const success =
      result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    if (!success.returnValue) return '';
    const raw: unknown = StellarSdk.scValToNative(success.returnValue);
    if (Buffer.isBuffer(raw) || raw instanceof Uint8Array) {
      return Buffer.from(raw).toString('hex');
    }
    return String(raw);
  }

  private extractTxHash(
    result: StellarSdk.rpc.Api.GetTransactionResponse,
  ): string {
    const success =
      result as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse;
    return success.txHash ?? '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
