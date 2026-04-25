import { Module } from '@nestjs/common';
import { GymCoursesController } from './gym-courses.controller';
import { GymCoursesService } from './gym-courses.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [GymCoursesController],
  providers: [GymCoursesService, PrismaService],
})
export class GymCoursesModule {}
