import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('commerce/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body()
    body: {
      saleId: string;
      method: string;
      amount: number;
      status?: string;
    },
  ) {
    return this.paymentsService.create(body);
  }

  @Get()
  findBySale(@Query('saleId') saleId: string) {
    return this.paymentsService.findBySale(saleId);
  }
}
