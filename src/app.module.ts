import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommerceModule } from './modules/commerce/commerce.module';

@Module({
  imports: [PrismaModule, CommerceModule],
  controllers: [AppController],
})
export class AppModule {}
