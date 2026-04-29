import { Module } from '@nestjs/common';
import { GymDashboardController } from './gym-dashboard.controller';
import { GymDashboardService } from './gym-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymDashboardController],
  providers: [GymDashboardService, PrismaService],
})
export class GymDashboardModule {}
