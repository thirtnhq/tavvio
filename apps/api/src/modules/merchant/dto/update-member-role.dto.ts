import { IsEnum } from 'class-validator';
import { TeamRole } from '../../../../generated/prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(TeamRole)
  role: TeamRole;
}
