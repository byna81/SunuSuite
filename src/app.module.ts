import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { CommerceModule } from './modules/commerce/commerce.module';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';

@Module({
  imports: [CommerceModule],
  controllers: [AppController, TenantsController],
  providers: [PrismaService, TenantsService],
})
export class AppModule {}
