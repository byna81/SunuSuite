import { Module } from '@nestjs/common';
import { GymSubscriptionsService } from './gym-subscriptions.service';
import { GymSubscriptionsController } from './gym-subscriptions.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymSubscriptionsController],
  providers: [GymSubscriptionsService, PrismaService],
})
export class GymSubscriptionsModule {}
