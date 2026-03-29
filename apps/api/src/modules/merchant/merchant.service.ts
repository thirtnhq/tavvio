import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KybStatus, Merchant, TeamRole } from '../../../generated/prisma/client';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { SettlementDto } from './dto/settlement.dto';
import { BrandingDto } from './dto/branding.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { KybSubmissionDto } from './dto/kyb-submission.dto';
import { detectAddressChain } from '@tavvio/types';

@Injectable()
export class MerchantService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile ──────────────────────────────────────────────────

  async getById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: { teamMembers: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return this.sanitize(merchant);
  }

  async update(id: string, dto: UpdateMerchantDto) {
    await this.ensureExists(id);

    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
      },
    });

    return this.sanitize(merchant);
  }

  // ── Settlement Config ────────────────────────────────────────

  async updateSettlement(id: string, dto: SettlementDto) {
    await this.ensureExists(id);

    // Validate settlement address against chain if both provided
    if (dto.settlementAddress) {
      const detection = detectAddressChain(dto.settlementAddress);
      const targetChain = dto.settlementChain;

      if (targetChain && detection.format !== 'unknown') {
        const isValidForChain = detection.possibleChains.includes(
          targetChain as any,
        );
        if (!isValidForChain) {
          throw new BadRequestException(
            `Address format (${detection.format}) is not compatible with chain "${targetChain}". ` +
              `This address is valid for: ${detection.possibleChains.join(', ')}`,
          );
        }
      }
    }

    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: {
        ...(dto.settlementAsset !== undefined && {
          settlementAsset: dto.settlementAsset,
        }),
        ...(dto.settlementAddress !== undefined && {
          settlementAddress: dto.settlementAddress,
        }),
        ...(dto.settlementChain !== undefined && {
          settlementChain: dto.settlementChain,
        }),
      },
    });

    return this.sanitize(merchant);
  }

  // ── Branding ─────────────────────────────────────────────────

  async updateBranding(id: string, dto: BrandingDto) {
    await this.ensureExists(id);

    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: {
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.brandColor !== undefined && { brandColor: dto.brandColor }),
        ...(dto.customDomain !== undefined && {
          customDomain: dto.customDomain,
        }),
      },
    });

    return this.sanitize(merchant);
  }

  // ── Team Management ──────────────────────────────────────────

  async getTeamMembers(merchantId: string) {
    await this.ensureExists(merchantId);

    return this.prisma.teamMember.findMany({
      where: { merchantId },
    });
  }

  async inviteTeamMember(merchantId: string, dto: InviteMemberDto) {
    await this.ensureExists(merchantId);

    if (dto.role === TeamRole.OWNER) {
      throw new BadRequestException('Cannot invite a member with OWNER role');
    }

    const existing = await this.prisma.teamMember.findFirst({
      where: { merchantId, email: dto.email },
    });

    if (existing) {
      throw new BadRequestException(
        'A team member with this email already exists',
      );
    }

    const member = await this.prisma.teamMember.create({
      data: {
        merchantId,
        email: dto.email,
        role: dto.role,
      },
    });

    // TODO: send invite email via NotificationsModule once implemented

    return member;
  }

  async updateMemberRole(
    merchantId: string,
    memberId: string,
    role: TeamRole,
  ) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, merchantId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.role === TeamRole.OWNER) {
      throw new BadRequestException('Cannot change the role of the owner');
    }

    if (role === TeamRole.OWNER) {
      throw new BadRequestException('Cannot promote a member to OWNER');
    }

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeTeamMember(merchantId: string, memberId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, merchantId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.role === TeamRole.OWNER) {
      throw new BadRequestException('Cannot remove the owner');
    }

    await this.prisma.teamMember.delete({ where: { id: memberId } });
  }

  // ── KYB ──────────────────────────────────────────────────────

  async getKybStatus(merchantId: string) {
    const merchant = await this.ensureExists(merchantId);
    return { kybStatus: merchant.kybStatus };
  }

  async submitKyb(merchantId: string, dto: KybSubmissionDto) {
    const merchant = await this.ensureExists(merchantId);

    if (merchant.kybStatus === KybStatus.APPROVED) {
      throw new BadRequestException('KYB already approved');
    }

    if (merchant.kybStatus === KybStatus.SUBMITTED) {
      throw new BadRequestException(
        'KYB already submitted and pending review',
      );
    }

    // Store KYB data and update status
    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        kybStatus: KybStatus.SUBMITTED,
        kybData: {
          businessType: dto.businessType,
          registrationNumber: dto.registrationNumber,
          country: dto.country,
          documents: dto.documents ?? [],
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return { kybStatus: updated.kybStatus };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private sanitize(merchant: Merchant & Record<string, any>) {
    const { passwordHash, apiKeyHash, ...profile } = merchant;
    return profile;
  }

  private async ensureExists(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }
}
