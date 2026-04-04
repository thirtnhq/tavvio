import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { Chain } from '@useroutr/types';
import { RelayService } from './relay.service';
import { PaymentsService } from '../payments/payments.service';
import { StellarService } from '../stellar/stellar.service';
import { BridgeRouterService } from '../bridge/bridge-router.service';

interface StellarLockJob {
  paymentId: string;
}

interface SourceUnlockJob {
  paymentId: string;
  preimage: string;
}

const DEFAULT_BACKOFF = { type: 'exponential' as const, delay: 1000 };

@Processor('relay')
export class RelayProcessor extends WorkerHost {
  private readonly logger = new Logger(RelayProcessor.name);

  constructor(
    @InjectQueue('relay') private readonly relayQueue: Queue,
    private readonly relayService: RelayService,
    private readonly paymentsService: PaymentsService,
    private readonly stellarService: StellarService,
    private readonly bridgeRouter: BridgeRouterService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'watchExpired':
        await this.relayService.processExpiredLocks();
        return;

      case 'completeStellarLock':
        await this.handleCompleteStellarLock(job.data as StellarLockJob);
        return;

      case 'withdrawStellar':
        await this.handleWithdrawStellar(job.data as StellarLockJob);
        return;

      case 'completeSourceUnlock':
        await this.handleCompleteSourceUnlock(job.data as SourceUnlockJob);
        return;

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  // ── Step 2: Lock funds on Stellar after source chain lock detected ────────

  private async handleCompleteStellarLock(data: StellarLockJob): Promise<void> {
    this.logger.log(`Completing Stellar lock for payment ${data.paymentId}`);

    const payment = await this.paymentsService.getById(data.paymentId);
    if (!payment || payment.status !== PaymentStatus.SOURCE_LOCKED) {
      this.logger.warn(
        `Payment ${data.paymentId} not in SOURCE_LOCKED status, skipping`,
      );
      return;
    }

    try {
      const relayPublicKey = process.env.STELLAR_RELAY_PUBLIC_KEY || '';
      const destAmount = BigInt(Math.floor(Number(payment.destAmount)));
      const hashlock = payment.hashlock!;
      // Stellar timelock = 12h (half of source chain's 24h)
      const stellarTimelock = Math.floor(Date.now() / 1000) + 43_200;

      // Phase 1: Settlement — fee deduction, relay receives merchantAmount
      const { merchantAmount } = await this.stellarService.settle({
        sourceAsset: payment.sourceAsset ?? relayPublicKey,
        sourceAmount: BigInt(Math.floor(Number(payment.sourceAmount))),
        destAsset: payment.destAsset,
        destAmount,
        merchant: payment.destAddress,
        hashlock,
        timelock: stellarTimelock,
      });

      // Phase 2: Lock merchantAmount in HTLC for merchant
      const stellarLockId = await this.stellarService.lockHTLC({
        sender: relayPublicKey,
        receiver: payment.destAddress,
        token: payment.destAsset,
        amount: merchantAmount,
        hashlock,
        timelock: stellarTimelock,
      });

      // Phase 3: Confirm settlement with HTLC lock ID
      await this.stellarService.confirmSettlement(hashlock, stellarLockId);

      await this.paymentsService.updateStatus(
        payment.id,
        PaymentStatus.STELLAR_LOCKED,
        { stellarLockId, stellarTxHash: stellarLockId },
      );

      this.logger.log(
        `Stellar settlement + lock completed for payment ${payment.id}, lockId: ${stellarLockId}`,
      );

      if (payment.htlcSecret) {
        await this.relayQueue.add(
          'withdrawStellar',
          { paymentId: payment.id } satisfies StellarLockJob,
          { attempts: 10, backoff: DEFAULT_BACKOFF },
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Stellar settlement/lock failed for payment ${data.paymentId}: ${msg}`,
      );
      await this.paymentsService.updateStatus(payment.id, PaymentStatus.FAILED);
    }
  }

  // ── Step 3: Withdraw from Stellar HTLC to reveal the secret ───────────────

  private async handleWithdrawStellar(data: StellarLockJob): Promise<void> {
    this.logger.log(
      `Initiating Stellar withdrawal for payment ${data.paymentId}`,
    );

    const payment = await this.paymentsService.getById(data.paymentId);
    if (!payment || payment.status !== PaymentStatus.STELLAR_LOCKED) {
      this.logger.warn(
        `Payment ${data.paymentId} not in STELLAR_LOCKED status, skipping`,
      );
      return;
    }

    if (!payment.htlcSecret) {
      this.logger.error(
        `No HTLC secret found for payment ${data.paymentId}, cannot withdraw`,
      );
      return;
    }

    try {
      const stellarLockId = payment.stellarLockId ?? payment.id;
      const stellarTxHash = await this.stellarService.withdrawHTLC(
        stellarLockId,
        payment.htlcSecret,
      );

      await this.paymentsService.updateStatus(
        payment.id,
        PaymentStatus.PROCESSING,
        { stellarTxHash },
      );

      this.logger.log(
        `Stellar withdrawal initiated for ${payment.id}, tx: ${stellarTxHash}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Stellar withdrawal failed for payment ${data.paymentId}: ${msg}`,
      );
      // Don't mark FAILED — BullMQ will retry. Only fail after exhausting retries.
      throw err;
    }
  }

  // ── Step 4: Use revealed secret to unlock funds on source chain ────────────

  private async handleCompleteSourceUnlock(
    data: SourceUnlockJob,
  ): Promise<void> {
    this.logger.log(`Completing source unlock for payment ${data.paymentId}`);

    const payment = await this.paymentsService.getById(data.paymentId);
    const validStatuses: PaymentStatus[] = [
      PaymentStatus.STELLAR_LOCKED,
      PaymentStatus.PROCESSING,
    ];

    if (!payment || !validStatuses.includes(payment.status)) {
      this.logger.warn(
        `Payment ${data.paymentId} not in valid status for unlock: ${payment?.status}`,
      );
      return;
    }

    if (!payment.sourceLockId) {
      this.logger.error(
        `No sourceLockId for payment ${data.paymentId}, cannot unlock`,
      );
      return;
    }

    try {
      if (payment.status !== PaymentStatus.PROCESSING) {
        await this.paymentsService.updateStatus(
          payment.id,
          PaymentStatus.PROCESSING,
        );
      }

      const txHash = await this.bridgeRouter.completeSourceLock({
        chain: payment.sourceChain as Chain,
        lockId: payment.sourceLockId,
        preimage: data.preimage,
      });

      await this.paymentsService.updateStatus(
        payment.id,
        PaymentStatus.COMPLETED,
        { destTxHash: txHash },
      );

      this.logger.log(
        `Source unlock completed for payment ${payment.id}, tx: ${txHash}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Source unlock failed for payment ${data.paymentId}: ${msg}`,
      );
      // Re-throw to let BullMQ retry. Secret is already revealed on Stellar,
      // so we MUST keep retrying the source unlock or funds are stuck.
      throw err;
    }
  }
}
