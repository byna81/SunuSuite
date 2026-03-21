import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';

@Module({
  imports: [
    PrismaModule,
    CommerceModule,
    DashboardModule,
    AuthModule,
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
