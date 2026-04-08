import { Module } from '@nestjs/common';
import { VehiclePaymentController } from './vehicle-payment.controller';
import { VehiclePaymentService } from './vehicle-payment.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [VehiclePaymentController],
  providers: [VehiclePaymentService, PrismaService],
  exports: [VehiclePaymentService],
})
export class VehiclePaymentModule {}
