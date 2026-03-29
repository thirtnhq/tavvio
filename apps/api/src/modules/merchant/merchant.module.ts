import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MerchantController],
  providers: [MerchantService, RolesGuard],
  exports: [MerchantService],
})
export class MerchantModule {}
