import { Module } from '@nestjs/common';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [OwnersController],
  providers: [OwnersService, PrismaService],
  exports: [OwnersService],
})
export class OwnersModule {}
