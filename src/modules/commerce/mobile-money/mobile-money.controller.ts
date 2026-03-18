import { Body, Controller, Patch, Post } from '@nestjs/common';
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
    @Body() body: { providerRef?: string },
    @Body('paymentId') _unused: string,
  ) {
    return null;
  }
}
