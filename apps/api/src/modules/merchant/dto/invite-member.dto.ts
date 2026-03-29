import { IsEmail, IsEnum } from 'class-validator';
import { TeamRole } from '../../../../generated/prisma/client.js';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(TeamRole)
  role!: TeamRole;
}
