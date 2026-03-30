import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksService } from './webhooks.service';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WEBHOOK_QUEUE_NAME } from './webhooks.constants';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: WEBHOOK_QUEUE_NAME })],
  providers: [WebhooksService, WebhooksProcessor],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}
