import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

import { CommerceModule } from './modules/commerce/commerce.module';
import { DashboardModule as CommerceDashboardModule } from './modules/commerce/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { ContractModule } from './modules/contract/contract.module';
import { RentModule } from './modules/rent/rent.module';
import { OwnerPaymentModule } from './modules/owner-payment/owner-payment.module';
import { DashboardModule as RealEstateDashboardModule } from './modules/dashboard/dashboard.module';
import { AgentModule } from './modules/agent/agent.module';

import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { VehicleCustomersModule } from './modules/vehicle-customers/vehicle-customers.module';
import { VehicleSaleContractsModule } from './modules/vehicle-sale-contracts/vehicle-sale-contracts.module';
import { VehicleRentalContractsModule } from './modules/vehicle-rental-contracts/vehicle-rental-contracts.module';

import { BusinessRequestsModule } from './modules/business-requests/business-requests.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { AppSettingsModule } from './modules/app-settings/app-settings.module';

import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';

import { CommerceAccountingModule } from './modules/commerce-accounting/commerce-accounting.module';
import { RealEstateAccountingModule } from './modules/real-estate-accounting/real-estate-accounting.module';
import { CommerceClosingModule } from './modules/commerce-closing/commerce-closing.module';

import { VtcDriversModule } from './modules/vtc-drivers/vtc-drivers.module';
import { VehicleAssignmentsModule } from './modules/vehicle-assignments/vehicle-assignments.module';
import { VtcContractsModule } from './modules/vtc-contracts/vtc-contracts.module';
import { VtcDriverPaymentsModule } from './modules/vtc-driver-payments/vtc-driver-payments.module';
import { VtcOwnerSettlementsModule } from './modules/vtc-owner-settlements/vtc-owner-settlements.module';
import { VehicleMaintenancesModule } from './modules/vehicle-maintenances/vehicle-maintenances.module';
import { VehiclePaymentModule } from './modules/vehicle-payment/vehicle-payment.module';
import { VehicleRentalDashboardModule } from './modules/vehicle-rental-dashboard/vehicle-rental-dashboard.module';
import { OwnersModule } from './modules/Owners/owners.module';

@Module({
  imports: [PrismaModule,
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
    BusinessRequestsModule,
    PlansModule,
    SubscriptionsModule,
    AdminModule,
    MailModule,
    ContractsModule,
    AppSettingsModule,
    CommerceAccountingModule,
    RealEstateAccountingModule,
    CommerceClosingModule,
    VtcDriversModule,
    VehicleAssignmentsModule,
    VtcContractsModule,
    VtcDriverPaymentsModule,
    VtcOwnerSettlementsModule,
    VehicleMaintenancesModule,
    VehiclePaymentModule,
    VehicleRentalDashboardModule,
    OwnersModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class AppModule {}
