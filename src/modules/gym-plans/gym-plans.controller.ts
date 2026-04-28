import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GymPlansService } from './gym-plans.service';

@Controller('gym-plans')
export class GymPlansController {
  constructor(private readonly service: GymPlansService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.service.update(id, tenantId, body);
  }

  @Patch(':id/toggle')
toggle(@Param('id') id: string, @Query('tenantId') tenantId: string) {
  return this.service.toggle(id, tenantId);
}
}



