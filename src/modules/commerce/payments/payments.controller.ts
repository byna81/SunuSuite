import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
      reference?: string;
      phoneNumber?: string;
    },
  ) {
    return this.paymentsService.create(body);
  }

  @Get()
  findBySale(@Query('saleId') saleId: string) {
    return this.paymentsService.findBySale(saleId);
  }

  @Get('methods/list')
  getMethods() {
    return this.paymentsService.getMethods();
  }

  @Patch(':paymentId/confirm')
  confirm(@Param('paymentId') paymentId: string) {
    return this.paymentsService.confirmPayment(paymentId);
  }

  @Patch(':paymentId/fail')
  fail(@Param('paymentId') paymentId: string) {
    return this.paymentsService.failPayment(paymentId);
  }
}
