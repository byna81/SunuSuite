import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GymPaymentsService } from './gym-payments.service';

@Controller('gym-payments')
export class GymPaymentsController {
  constructor(private readonly service: GymPaymentsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }
}
