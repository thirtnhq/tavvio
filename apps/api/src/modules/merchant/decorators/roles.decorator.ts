import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '../../../../generated/prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TeamRole[]) => SetMetadata(ROLES_KEY, roles);
