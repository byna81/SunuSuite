import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VtcContractsController } from './vtc-contracts.controller';
import { VtcContractsService } from './vtc-contracts.service';

@Module({
  imports: [PrismaModule],
  controllers: [VtcContractsController],
  providers: [VtcContractsService],
})
export class VtcContractsModule {}
