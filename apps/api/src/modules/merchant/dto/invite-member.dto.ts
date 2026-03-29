import { IsEmail, IsEnum } from 'class-validator';
import { TeamRole } from '@prisma/client';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(TeamRole)
  role!: TeamRole;
}
