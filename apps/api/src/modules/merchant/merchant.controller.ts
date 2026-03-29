import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentMerchant } from './decorators/current-merchant.decorator';
import { Roles } from './decorators/roles.decorator';
import { BrandingDto } from './dto/branding.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { KybSubmissionDto } from './dto/kyb-submission.dto';
import { SettlementDto } from './dto/settlement.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RolesGuard } from './guards/roles.guard';
import { MerchantService } from './merchant.service';

@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  // ── Profile ──────────────────────────────────────────────────

  @Get('me')
  getProfile(@CurrentMerchant('id') merchantId: string) {
    return this.merchantService.getById(merchantId);
  }

  @Patch('me')
  updateProfile(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantService.update(merchantId, dto);
  }

  // ── Settlement ───────────────────────────────────────────────

  @Patch('me/settlement')
  updateSettlement(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: SettlementDto,
  ) {
    return this.merchantService.updateSettlement(merchantId, dto);
  }

  // ── Branding ─────────────────────────────────────────────────

  @Patch('me/branding')
  updateBranding(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: BrandingDto,
  ) {
    return this.merchantService.updateBranding(merchantId, dto);
  }

  // ── Team Management ──────────────────────────────────────────

  @Get('me/team')
  getTeamMembers(@CurrentMerchant('id') merchantId: string) {
    return this.merchantService.getTeamMembers(merchantId);
  }

  @Post('me/team')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  inviteTeamMember(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.merchantService.inviteTeamMember(merchantId, dto);
  }

  @Patch('me/team/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  updateMemberRole(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.merchantService.updateMemberRole(merchantId, memberId, dto.role);
  }

  @Delete('me/team/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(TeamRole.OWNER)
  removeTeamMember(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') memberId: string,
  ) {
    return this.merchantService.removeTeamMember(merchantId, memberId);
  }

  // ── KYB ──────────────────────────────────────────────────────

  @Get('me/kyb')
  getKybStatus(@CurrentMerchant('id') merchantId: string) {
    return this.merchantService.getKybStatus(merchantId);
  }

  @Post('me/kyb')
  @HttpCode(HttpStatus.ACCEPTED)
  submitKyb(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: KybSubmissionDto,
  ) {
    return this.merchantService.submitKyb(merchantId, dto);
  }
}
