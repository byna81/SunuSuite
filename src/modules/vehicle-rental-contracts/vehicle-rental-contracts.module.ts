import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleRentalContractsController } from './vehicle-rental-contracts.controller';
import { VehicleRentalContractsService } from './vehicle-rental-contracts.service';

@Module({
  controllers: [VehicleRentalContractsController],
  providers: [VehicleRentalContractsService, PrismaService],
})
export class VehicleRentalContractsModule {}
