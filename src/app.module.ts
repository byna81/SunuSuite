import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { DashboardModule as CommerceDashboardModule } from './modules/commerce/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';
import { ContractModule } from './modules/contract/contract.module';
import { RentModule } from './modules/rent/rent.module';
import { OwnerPaymentModule } from './modules/owner-payment/owner-payment.module';
import { DashboardModule as RealEstateDashboardModule } from './modules/dashboard/dashboard.module';
import { AgentModule } from './modules/agent/agent.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { VehicleCustomersModule } from './modules/vehicle-customers/vehicle-customers.module';
import { VehicleSaleContractsModule } from './modules/vehicle-sale-contracts/vehicle-sale-contracts.module';
import { VehicleRentalContractsModule } from './modules/vehicle-rental-contracts/vehicle-rental-contracts.module';

@Module({
  imports: [
    PrismaModule,
    CommerceModule,
    CommerceDashboardModule,
    AuthModule,
    PropertyModule,
    ContractModule,
    RentModule,
    OwnerPaymentModule,
    RealEstateDashboardModule,
    AgentModule,
    VehiclesModule,
    VehicleCustomersModule,
    VehicleSaleContractsModule,
    VehicleRentalContractsModule,
  ],
  controllers: [
    TenantsController,
  ],
  providers: [
    TenantsService,
  ],
})
export class AppModule {}
