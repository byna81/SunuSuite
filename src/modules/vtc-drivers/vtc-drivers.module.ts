import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VtcDriversController } from './vtc-drivers.controller';
import { VtcDriversService } from './vtc-drivers.service';

@Module({
  imports: [PrismaModule],
  controllers: [VtcDriversController],
  providers: [VtcDriversService],
  exports: [VtcDriversService],
})
export class VtcDriversModule {}
