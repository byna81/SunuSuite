import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VtcOwnerSettlementsController } from './vtc-owner-settlements.controller';
import { VtcOwnerSettlementsService } from './vtc-owner-settlements.service';

@Module({
  imports: [PrismaModule],
  controllers: [VtcOwnerSettlementsController],
  providers: [VtcOwnerSettlementsService],
})
export class VtcOwnerSettlementsModule {}
