import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() body: any) {
    return this.service.addPayment(id, body);
  }
}
