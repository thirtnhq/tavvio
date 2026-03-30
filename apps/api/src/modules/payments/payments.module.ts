import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { QuotesModule } from '../quotes/quotes.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { StellarModule } from '../stellar/stellar.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventsModule,
    QuotesModule,
    WebhooksModule,
    StellarModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule { }
