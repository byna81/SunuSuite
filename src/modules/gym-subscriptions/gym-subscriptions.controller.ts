import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GymSubscriptionsService } from './gym-subscriptions.service';

@Controller('gym-subscriptions')
export class GymSubscriptionsController {
  constructor(private readonly service: GymSubscriptionsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Patch(':id/status')
updateStatus(
  @Param('id') id: string,
  @Query('tenantId') tenantId: string,
  @Body() body: any,
) {
  return this.service.updateStatus(id, tenantId, body);
}

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body()
    body: {
      memberId: string;
      type: string;
      price: number;
      startDate: string;
      endDate: string;
    },
  ) {
    return this.service.create(tenantId, body);
  }
}


