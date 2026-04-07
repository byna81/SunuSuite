import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehicleMaintenancesService } from './vehicle-maintenances.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('vehicle-maintenances')
@UseGuards(JwtAuthGuard)
export class VehicleMaintenancesController {
  constructor(private readonly service: VehicleMaintenancesService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(tenantId, vehicleId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.service.updateStatus(id, body.status);
  }
}
