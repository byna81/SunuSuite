import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { GymCoachesService } from './gym-coaches.service';

@Controller('gym-coaches')
export class GymCoachesController {
  constructor(private readonly service: GymCoachesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  async create(
    @Query('tenantId') tenantId: string,
    @Body()
body: {
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
},
  ) {
    return this.service.create(tenantId, body);
  }
}
