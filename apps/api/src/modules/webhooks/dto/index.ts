import { IsString, IsArray, IsUrl, IsOptional } from 'class-validator';
import { WebhookEventType } from '../webhooks.constants';

export class RegisterWebhookDto {
  @IsUrl()
  webhookUrl!: string;

  @IsArray()
  subscribedEvents!: WebhookEventType[];
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @IsOptional()
  @IsArray()
  subscribedEvents?: WebhookEventType[];
}

export class WebhookEventResponseDto {
  id?: string;
  merchantId?: string;
  paymentId?: string;
  eventType?: string;
  status?: 'PENDING' | 'DELIVERED' | 'FAILED' | 'EXHAUSTED';
  attempts?: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  createdAt?: Date;
}

export class WebhookLogFiltersDto {
  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'DELIVERED' | 'FAILED' | 'EXHAUSTED';

  @IsOptional()
  @IsString()
  eventType?: WebhookEventType;

  @IsOptional()
  startDate?: string; // ISO 8601 date

  @IsOptional()
  endDate?: string; // ISO 8601 date

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}
