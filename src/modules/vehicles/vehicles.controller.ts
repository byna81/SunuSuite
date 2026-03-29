import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // 👉 À adapter selon ton auth guard actuel
  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.vehiclesService.findAll(tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.tenantId;
    return this.vehiclesService.create(tenantId, body);
  }
}
