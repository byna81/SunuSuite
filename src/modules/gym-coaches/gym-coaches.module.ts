import { Module } from '@nestjs/common';
import { GymCoachesController } from './gym-coaches.controller';
import { GymCoachesService } from './gym-coaches.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymCoachesController],
  providers: [GymCoachesService, PrismaService],
})
export class GymCoachesModule {}
