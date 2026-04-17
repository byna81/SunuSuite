import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminSystemService } from './admin-system.service';
import { AdminSystemController } from './admin-system.controller';

@Module({
  imports: [PrismaModule],
  providers: [AdminSystemService],
  controllers: [AdminSystemController],
})
export class AdminSystemModule {}
