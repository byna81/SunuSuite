import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealEstateContractPdfService } from './real-estate-contract-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContractController],
  providers: [ContractService, RealEstateContractPdfService],
  exports: [ContractService],
})
export class ContractModule {}
