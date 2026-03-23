import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
