import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TeamRole[]) => SetMetadata(ROLES_KEY, roles);
