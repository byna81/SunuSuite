import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { CommerceModule } from './modules/commerce/commerce.module';

@Module({
  imports: [CommerceModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
