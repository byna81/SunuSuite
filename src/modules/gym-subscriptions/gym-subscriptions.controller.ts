import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { GymSubscriptionsService } from './gym-subscriptions.service';

@Controller('gym-subscriptions')
export class GymSubscriptionsController {
  constructor(private readonly service: GymSubscriptionsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
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
