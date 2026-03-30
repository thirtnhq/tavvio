import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { QuotesService } from './quotes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [StellarModule, PrismaModule],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
