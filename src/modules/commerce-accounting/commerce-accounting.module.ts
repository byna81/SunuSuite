import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommerceAccountingController } from './commerce-accounting.controller';
import { CommerceAccountingService } from './commerce-accounting.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommerceAccountingController],
  providers: [CommerceAccountingService],
  exports: [CommerceAccountingService],
})
export class CommerceAccountingModule {}
