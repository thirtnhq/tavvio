import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DestType, Recipient } from '@prisma/client';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { RecipientFiltersDto } from './dto/recipient-filters.dto';
import { UpdateRecipientDto } from './dto/update-recipient.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateRecipientDto): Promise<Recipient> {
    // Check unique name per merchant
    const existing = await this.prisma.recipient.findUnique({
      where: {
        merchantId_name: { merchantId, name: dto.name },
      },
    });

    if (existing) {
      throw new BadRequestException('Recipient name must be unique per merchant');
    }

    const recipient = await this.prisma.recipient.create({
      data: {
        merchantId,
        name: dto.name,
        type: dto.type,
        details: dto.details as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
      },
    });

    return recipient;
  }

  async list(merchantId: string, filters: RecipientFiltersDto) {
    const where: Prisma.RecipientWhereInput = { merchantId };

    if (filters.type) where.type = filters.type as DestType;
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    const [total, recipients] = await Promise.all([
      this.prisma.recipient.count({ where }),
      this.prisma.recipient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
    ]);

    return {
      total,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
      data: recipients,
    };
  }

  async getById(id: string, merchantId: string): Promise<Recipient> {
    const recipient = await this.prisma.recipient.findFirst({
      where: { id, merchantId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    return recipient;
  }

  async update(id: string, merchantId: string, dto: UpdateRecipientDto): Promise<Recipient> {
    const recipient = await this.getById(id, merchantId);

    // Check unique name if changing name
    if (dto.name && dto.name !== recipient.name) {
      const nameConflict = await this.prisma.recipient.findUnique({
        where: {
          merchantId_name: { merchantId, name: dto.name },
        },
      });
      if (nameConflict) {
        throw new BadRequestException('Recipient name must be unique per merchant');
      }
    }

    return this.prisma.recipient.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        details: dto.details as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? recipient.isDefault,
      },
    });
  }

  async delete(id: string, merchantId: string): Promise<void> {
    const recipient = await this.getById(id, merchantId);

    // Prevent deletion if referenced by payouts
    const payoutCount = await this.prisma.payout.count({
      where: { recipientId: id },
    });
    if (payoutCount > 0) {
      throw new BadRequestException('Cannot delete recipient used in payouts');
    }

    await this.prisma.recipient.delete({
      where: { id },
    });
  }
}

