import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VehicleMaintenancesController } from './vehicle-maintenances.controller';
import { VehicleMaintenancesService } from './vehicle-maintenances.service';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleMaintenancesController],
  providers: [VehicleMaintenancesService],
})
export class VehicleMaintenancesModule {}
