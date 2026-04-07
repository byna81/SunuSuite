import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { VehiclePaymentService } from './vehicle-payment.service';

@Controller('vehicle-payments')
export class VehiclePaymentController {
  constructor(private readonly service: VehiclePaymentService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('paymentType') paymentType?: string,
  ) {
    return this.service.findAll(tenantId, paymentType);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }
}
