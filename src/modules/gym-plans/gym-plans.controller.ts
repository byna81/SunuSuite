import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GymPlansService } from './gym-plans.service';

@Controller('gym-plans')
export class GymPlansController {
  constructor(private service: GymPlansService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }
}
