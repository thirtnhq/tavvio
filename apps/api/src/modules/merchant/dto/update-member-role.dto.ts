import { IsEnum } from 'class-validator';
import { TeamRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(TeamRole)
  role!: TeamRole;
}
