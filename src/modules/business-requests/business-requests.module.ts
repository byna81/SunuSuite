import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessRequestsController } from './business-requests.controller';
import { BusinessRequestsService } from './business-requests.service';

@Module({
  controllers: [BusinessRequestsController],
  providers: [BusinessRequestsService, PrismaService],
  exports: [BusinessRequestsService],
})
export class BusinessRequestsModule {}
