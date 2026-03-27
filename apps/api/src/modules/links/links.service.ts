import {
  Injectable,
  NotFoundException,
  GoneException,
  BadRequestException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateLinkDto } from './dto/create-link.dto.js';

const BASE_URL = process.env.PAYMENT_LINK_BASE_URL ?? 'https://pay.tavvio.io';
const SHORT_CODE_LENGTH = 8;
const SHORT_CODE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateLinkDto) {
    const shortCode = await this.generateUniqueShortCode();
    const url = `${BASE_URL}/l/${shortCode}`;
    const qrCodeUrl = await QRCode.toDataURL(url);

    const link = await this.prisma.paymentLink.create({
      data: {
        merchantId,
        shortCode,
        amount: dto.amount ?? null,
        currency: dto.currency,
        description: dto.description ?? null,
        singleUse: dto.single_use,
        expiresAt: dto.expires_at ? new Date(dto.expires_at) : null,
        qrCodeUrl,
      },
    });

    return this.formatLink(link, url);
  }

  async getById(linkId: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    return this.formatLink(link, `${BASE_URL}/l/${link.shortCode}`);
  }

  async getByMerchant(
    merchantId: string,
    filters?: { page?: number; limit?: number },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      this.prisma.paymentLink.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentLink.count({ where: { merchantId } }),
    ]);

    return {
      data: links.map((l) =>
        this.formatLink(l, `${BASE_URL}/l/${l.shortCode}`),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deactivate(merchantId: string, linkId: string) {
    const link = await this.prisma.paymentLink.findFirst({
      where: { id: linkId, merchantId },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    const updated = await this.prisma.paymentLink.update({
      where: { id: linkId },
      data: { active: false },
    });

    return this.formatLink(updated, `${BASE_URL}/l/${updated.shortCode}`);
  }

  async resolve(shortCode: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { shortCode },
      include: { merchant: { select: { name: true } } },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    if (!link.active) {
      throw new GoneException('This payment link is no longer active');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new GoneException('This payment link has expired');
    }

    if (link.singleUse && link.usedCount > 0) {
      throw new GoneException('This payment link has already been used');
    }

    // Increment view count
    await this.prisma.paymentLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      id: this.formatId(link.id),
      amount: link.amount ? Number(link.amount) : null,
      currency: link.currency,
      description: link.description,
      singleUse: link.singleUse,
      expiresAt: link.expiresAt,
      merchantName: link.merchant.name,
    };
  }

  async markUsed(linkId: string, paymentId: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    await this.prisma.paymentLink.update({
      where: { id: linkId },
      data: { usedCount: { increment: 1 } },
    });

    // Associate payment with link
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { linkId },
    });
  }

  async getStats(merchantId: string, linkId: string) {
    const link = await this.prisma.paymentLink.findFirst({
      where: { id: linkId, merchantId },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: { linkId, status: 'COMPLETED' },
      select: { destAmount: true },
    });

    const totalPayments = payments.length;
    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.destAmount),
      0,
    );
    const conversionRate =
      link.viewCount > 0 ? (totalPayments / link.viewCount) * 100 : 0;

    return {
      linkId: this.formatId(link.id),
      totalViews: link.viewCount,
      totalPayments,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue,
      currency: link.currency,
    };
  }

  async fireWebhook(merchantId: string, linkId: string, paymentId: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: linkId },
    });

    if (!link) return;

    await this.prisma.webhookEvent.create({
      data: {
        merchantId,
        paymentId,
        eventType: 'link.paid',
        payload: {
          linkId: this.formatId(linkId),
          paymentId,
          currency: link.currency,
          amount: link.amount ? Number(link.amount) : null,
        },
        status: 'PENDING',
      },
    });
  }

  private formatLink(
    link: {
      id: string;
      shortCode: string;
      amount: unknown;
      currency: string;
      description: string | null;
      singleUse: boolean;
      usedCount: number;
      expiresAt: Date | null;
      active: boolean;
      createdAt: Date;
      qrCodeUrl: string | null;
    },
    url: string,
  ) {
    return {
      id: this.formatId(link.id),
      url,
      qr_code_url: link.qrCodeUrl,
      amount: link.amount ? Number(link.amount) : null,
      currency: link.currency,
      description: link.description,
      single_use: link.singleUse,
      expires_at: link.expiresAt,
      active: link.active,
      used_count: link.usedCount,
      created_at: link.createdAt,
    };
  }

  private formatId(id: string): string {
    return `lnk_${id}`;
  }

  private async generateUniqueShortCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.randomShortCode();
      const existing = await this.prisma.paymentLink.findUnique({
        where: { shortCode: code },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('Failed to generate unique short code');
  }

  private randomShortCode(): string {
    const bytes = crypto.randomBytes(SHORT_CODE_LENGTH);
    return Array.from(bytes)
      .map((b) => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length])
      .join('');
  }
}
