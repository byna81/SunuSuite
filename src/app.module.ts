import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';

@Module({
  imports: [
    PrismaModule,
    CommerceModule,
  ],
  controllers: [
    AppController,
    TenantsController,
  ],
  providers: [
    TenantsService,
  ],
})
export class AppModule {}
