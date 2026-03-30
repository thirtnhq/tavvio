import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RelayService } from './relay.service';
import { RelayProcessor } from './relay.processor';
import { StellarModule } from '../stellar/stellar.module';
import { PaymentsModule } from '../payments/payments.module';
import { BridgeModule } from '../bridge/bridge.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'relay',
    }),
    StellarModule,
    PaymentsModule,
    BridgeModule,
  ],
  providers: [RelayService, RelayProcessor],
  exports: [RelayService],
})
export class RelayModule {}
