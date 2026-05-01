import { Module } from '@nestjs/common';
import { GymPaymentsController } from './gym-payments.controller';
import { GymPaymentsService } from './gym-payments.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymPaymentsController],
  providers: [GymPaymentsService, PrismaService],
})
export class GymPaymentsModule {}
