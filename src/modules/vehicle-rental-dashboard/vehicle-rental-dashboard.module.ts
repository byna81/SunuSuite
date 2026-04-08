import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VehicleRentalDashboardController } from './vehicle-rental-dashboard.controller';
import { VehicleRentalDashboardService } from './vehicle-rental-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleRentalDashboardController],
  providers: [VehicleRentalDashboardService],
})
export class VehicleRentalDashboardModule {}
