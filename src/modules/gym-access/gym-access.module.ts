import { Module } from '@nestjs/common';
import { GymAccessController } from './gym-access.controller';
import { GymAccessService } from './gym-access.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymAccessController],
  providers: [GymAccessService, PrismaService],
})
export class GymAccessModule {}
