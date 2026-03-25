import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OwnerPaymentController } from './owner-payment.controller';
import { OwnerPaymentService } from './owner-payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [OwnerPaymentController],
  providers: [OwnerPaymentService],
})
export class OwnerPaymentModule {}
