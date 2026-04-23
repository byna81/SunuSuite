import { Module } from '@nestjs/common';
import { GymMembersController } from './gym-members.controller';
import { GymMembersService } from './gym-members.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GymMembersController],
  providers: [GymMembersService],
  exports: [GymMembersService],
})
export class GymMembersModule {}
