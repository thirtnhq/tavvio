import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ethers } from 'ethers';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PaymentStatus } from '@prisma/client';
import { Chain, SourceLockEvent } from '@useroutr/types';
import { StellarService } from '../stellar/stellar.service';
import { PaymentsService } from '../payments/payments.service';
import { BridgeRouterService } from '../bridge/bridge-router.service';

/** Soroban contract event shape */
interface StellarHTLCEvent {
  type: 'Locked' | 'Withdrawn' | 'Refunded' | 'Settled' | 'Confirmed';
  lock_id: string;
  preimage: string;
}

const EVM_CHAINS: Chain[] = [
  'ethereum',
  'base',
  'polygon',
  'arbitrum',
  'avalanche',
];

const HTLC_LOCKED_ABI = [
  'event Locked(bytes32 indexed lockId, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashlock, uint256 timelock, address token)',
];

const DEFAULT_BACKOFF = { type: 'exponential' as const, delay: 1000 };
const MAX_RECONNECT_DELAY_MS = 60_000;

@Injectable()
export class RelayService implements OnModuleInit {
  private readonly logger = new Logger(RelayService.name);

  constructor(
    @InjectQueue('relay') private readonly relayQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    private readonly stellarService: StellarService,
    private readonly paymentsService: PaymentsService,
    private readonly bridgeRouter: BridgeRouterService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit() {
    this.logger.log('RelayService initializing...');

    this.watchStellarHTLC();

    for (const chain of EVM_CHAINS) {
      this.startChainWatcher(chain);
    }

    await this.relayQueue.add(
      'watchExpired',
      {},
      { repeat: { every: 60_000 }, jobId: 'watchExpired' },
    );
  }

  // ── Stellar watcher ────────────────────────────────────────────────────────

  private watchStellarHTLC(): void {
    const htlcContractId = process.env.SOROBAN_HTLC_CONTRACT_ID ?? '';
    if (!htlcContractId) {
      this.logger.warn(
        'SOROBAN_HTLC_CONTRACT_ID not set, skipping Stellar watcher',
      );
      return;
    }

    this.stellarService.streamContractEvents(
      htlcContractId,
      (event: StellarHTLCEvent) => {
        if (event.type === 'Withdrawn') {
          this.handleStellarWithdrawal({
            lockId: event.lock_id,
            preimage: event.preimage,
          }).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Stellar withdrawal handler failed: ${msg}`);
          });
        }
      },
    );
  }

  private async handleStellarWithdrawal(event: {
    lockId: string;
    preimage: string;
  }): Promise<void> {
    this.logger.log(`Detected Stellar withdrawal for lock ${event.lockId}`);

    const payment = await this.paymentsService.findByStellarLockId(
      event.lockId,
    );
    if (!payment || payment.status === PaymentStatus.COMPLETED) return;

    await this.relayQueue.add(
      'completeSourceUnlock',
      { paymentId: payment.id, preimage: event.preimage },
      { attempts: 10, backoff: DEFAULT_BACKOFF },
    );
  }

  // ── EVM watcher with auto-reconnect ────────────────────────────────────────

  /**
   * Starts the chain watcher with automatic reconnection on failure.
   * Uses exponential backoff capped at MAX_RECONNECT_DELAY_MS.
   */
  private startChainWatcher(chain: Chain, attempt = 0): void {
    const rpcUrl = process.env[`RPC_${chain.toUpperCase()}`];
    const htlcAddress = process.env[`HTLC_ADDRESS_${chain.toUpperCase()}`];

    if (
      !rpcUrl ||
      !htlcAddress ||
      htlcAddress === '0x...' ||
      !htlcAddress.match(/^0x[0-9a-fA-F]{40}$/)
    ) {
      this.logger.debug(
        `RPC or valid HTLC address missing for ${chain}, skipping watcher`,
      );
      return;
    }

    this.watchSourceChain(chain, rpcUrl, htlcAddress)
      .then(() => {
        if (attempt > 0) {
          this.logger.log(`Reconnected to ${chain} after ${attempt} retries`);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const delay = Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
        this.logger.error(
          `EVM watcher failed for ${chain}: ${msg}. Retrying in ${delay}ms...`,
        );
        setTimeout(() => this.startChainWatcher(chain, attempt + 1), delay);
      });
  }

  private async watchSourceChain(
    chain: Chain,
    rpcUrl: string,
    htlcAddress: string,
  ): Promise<void> {
    this.logger.log(`Watching EVM chain: ${chain} at ${htlcAddress}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const htlc = new ethers.Contract(htlcAddress, HTLC_LOCKED_ABI, provider);

    await this.replayMissedEvents(chain, htlc, provider);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- htlc.on() returns Contract, not a Promise
    htlc.on(
      'Locked',
      (
        lockId: string,
        sender: string,
        receiver: string,
        amount: bigint,
        hashlock: string,
        timelock: bigint,
        token: string,
        event: ethers.ContractEventPayload,
      ) => {
        this.handleSourceLock({
          lockId,
          sender,
          receiver,
          amount,
          hashlock,
          timelock: Number(timelock),
          token,
          chain,
        })
          .then(() => this.setProcessedBlock(chain, event.log.blockNumber))
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Failed to handle Locked event on ${chain}: ${msg}`,
            );
          });
      },
    );
  }

  private async replayMissedEvents(
    chain: Chain,
    htlc: ethers.Contract,
    provider: ethers.JsonRpcProvider,
  ): Promise<void> {
    const lastBlock = await this.getProcessedBlock(chain);
    const currentBlock = await provider.getBlockNumber();

    if (lastBlock > 0 && lastBlock < currentBlock) {
      this.logger.log(
        `Scanning ${chain} for missed events from block ${lastBlock} to ${currentBlock}`,
      );

      const events = await htlc.queryFilter(
        htlc.filters.Locked(),
        lastBlock + 1,
        currentBlock,
      );

      for (const evt of events) {
        const log = evt as ethers.EventLog;
        if (!log.args) continue;

        const [lockId, sender, receiver, amount, hashlock, timelock, token] =
          log.args as unknown as [
            string,
            string,
            string,
            bigint,
            string,
            bigint,
            string,
          ];

        await this.handleSourceLock({
          lockId,
          sender,
          receiver,
          amount,
          hashlock,
          timelock: Number(timelock),
          token,
          chain,
        });
      }
    }

    await this.setProcessedBlock(chain, currentBlock);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private async handleSourceLock(event: SourceLockEvent): Promise<void> {
    this.logger.log(`Detected source lock: ${event.lockId} on ${event.chain}`);

    const payment = await this.paymentsService.handleSourceLock(event);
    if (!payment) return;

    await this.relayQueue.add(
      'completeStellarLock',
      { paymentId: payment.id },
      { attempts: 10, backoff: DEFAULT_BACKOFF },
    );
  }

  // ── Watchdog ───────────────────────────────────────────────────────────────

  async processExpiredLocks(): Promise<void> {
    this.logger.log('Checking for expired locks...');
    const expiredPayments = await this.paymentsService.findExpiredLocked();

    for (const payment of expiredPayments) {
      this.logger.log(`Refunding expired payment: ${payment.id}`);

      if (payment.stellarLockId) {
        try {
          await this.stellarService.refundHTLC(payment.stellarLockId);
        } catch (err) {
          this.logger.error(
            `Failed to refund Stellar lock ${payment.stellarLockId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      if (payment.sourceLockId) {
        try {
          await this.bridgeRouter.refundSourceLock({
            chain: payment.sourceChain as Chain,
            lockId: payment.sourceLockId,
          });
        } catch (err) {
          this.logger.error(
            `Failed to refund source lock ${payment.sourceLockId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      await this.paymentsService.updateStatus(
        payment.id,
        PaymentStatus.REFUNDED,
      );
    }
  }

  // ── Redis cursor ───────────────────────────────────────────────────────────

  private async getProcessedBlock(chain: string): Promise<number> {
    const block = await this.redis.get(`relay:last_block:${chain}`);
    return block ? parseInt(block, 10) : 0;
  }

  private async setProcessedBlock(
    chain: string,
    blockNumber: number,
  ): Promise<void> {
    await this.redis.set(`relay:last_block:${chain}`, blockNumber.toString());
  }
}
