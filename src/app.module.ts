import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { DashboardModule } from './modules/commerce/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';
import { ContractModule } from './modules/contract/contract.module';
import { RentModule } from './modules/rent/rent.module';
import { OwnerPaymentModule } from './modules/owner-payment/owner-payment.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    CommerceModule,
    DashboardModule,
    AuthModule,
    PropertyModule,
    ContractModule,
    RentModule,
    OwnerPaymentModule,
    DashboardModule,
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
