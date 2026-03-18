import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { MobileMoneyService } from './mobile-money.service';

@Controller('commerce/mobile-money')
export class MobileMoneyController {
  constructor(private readonly mobileMoneyService: MobileMoneyService) {}

  @Post('initiate')
  initiate(
    @Body()
    body: {
      saleId: string;
      provider: 'wave' | 'orange_money';
      amount: number;
      phoneNumber: string;
    },
  ) {
    return this.mobileMoneyService.initiate(body);
  }

  @Patch(':paymentId/confirm')
  confirm(
    @Param('paymentId') paymentId: string,
    @Body() body: { providerRef?: string },
  ) {
    return this.mobileMoneyService.confirmByPaymentId(
      paymentId,
      body?.providerRef,
    );
  }

  @Patch(':paymentId/fail')
  fail(
    @Param('paymentId') paymentId: string,
    @Body() body: { providerRef?: string },
  ) {
    return this.mobileMoneyService.failByPaymentId(
      paymentId,
      body?.providerRef,
    );
  }

  @Post('webhook')
  webhook(
    @Body()
    body: {
      paymentId: string;
      providerRef?: string;
      status: 'paid' | 'failed';
    },
  ) {
    return this.mobileMoneyService.handleWebhook(body);
  }
}
