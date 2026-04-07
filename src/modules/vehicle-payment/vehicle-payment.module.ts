import { Module } from '@nestjs/common';
import { VehiclePaymentService } from './vehicle-payment.service';
import { VehiclePaymentController } from './vehicle-payment.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [VehiclePaymentController],
  providers: [VehiclePaymentService, PrismaService],
})
export class VehiclePaymentModule {}
