import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommerceClosingController } from './commerce-closing.controller';
import { CommerceClosingService } from './commerce-closing.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommerceClosingController],
  providers: [CommerceClosingService],
  exports: [CommerceClosingService],
})
export class CommerceClosingModule {}
