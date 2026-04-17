import { Module } from '@nestjs/common';
import { AdminSystemService } from './admin-system.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminSystemService],
})
export class AdminSystemModule {}
