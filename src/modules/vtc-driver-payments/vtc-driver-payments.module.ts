import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VtcDriverPaymentsController } from './vtc-driver-payments.controller';
import { VtcDriverPaymentsService } from './vtc-driver-payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [VtcDriverPaymentsController],
  providers: [VtcDriverPaymentsService],
})
export class VtcDriverPaymentsModule {}
