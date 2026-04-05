import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { RealEstateAccountingController } from './real-estate-accounting.controller';
import { RealEstateAccountingService } from './real-estate-accounting.service';

@Module({
  imports: [PrismaModule],
  controllers: [RealEstateAccountingController],
  providers: [RealEstateAccountingService],
  exports: [RealEstateAccountingService],
})
export class RealEstateAccountingModule {}
