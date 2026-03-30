import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleSaleContractsController } from './vehicle-sale-contracts.controller';
import { VehicleSaleContractsService } from './vehicle-sale-contracts.service';

@Module({
  controllers: [VehicleSaleContractsController],
  providers: [VehicleSaleContractsService, PrismaService],
})
export class VehicleSaleContractsModule {}
