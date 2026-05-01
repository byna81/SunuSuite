import { Module } from '@nestjs/common';
import { GymPlansService } from './gym-plans.service';
import { GymPlansController } from './gym-plans.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymPlansController],
  providers: [GymPlansService, PrismaService],
})
export class GymPlansModule {}
