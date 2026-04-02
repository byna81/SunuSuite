import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../prisma/prisma.service';

import { MailModule } from '../mail/mail.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    MailModule,
    ContractsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
