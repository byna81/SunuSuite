import { Controller, Get, Post, Body } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';

@Controller('fleet/vehicles')
export class VehiclesController {
  constructor(private service: VehiclesService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
