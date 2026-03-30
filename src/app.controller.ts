import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { VehicleCustomersModule } from './modules/vehicle-customers/vehicle-customers.module';

@Module({
  imports: [
    AuthModule,
    VehiclesModule,
    VehicleCustomersModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
