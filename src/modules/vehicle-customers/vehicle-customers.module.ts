import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleCustomersController } from './vehicle-customers.controller';
import { VehicleCustomersService } from './vehicle-customers.service';

@Module({
  controllers: [VehicleCustomersController],
  providers: [VehicleCustomersService, PrismaService],
})
export class VehicleCustomersModule {}
