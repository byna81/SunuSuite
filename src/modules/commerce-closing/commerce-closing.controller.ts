import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CommerceClosingService } from './commerce-closing.service';

@Controller('commerce/closings')
export class CommerceClosingController {
  constructor(
    private readonly commerceClosingService: CommerceClosingService,
  ) {}

  @Post()
  createClosing(
    @Body()
    body: {
      tenantId: string;
      month: number;
      year: number;
      openingBalance?: number;
      note?: string;
      closedBy?: string;
    },
  ) {
    return this.commerceClosingService.createClosing(body);
  }

  @Get()
  getClosings(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.commerceClosingService.getClosings({
      tenantId,
      month,
      year,
    });
  }

  @Get('summary')
  getClosingSummary(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.commerceClosingService.getClosingSummary({
      tenantId,
      month,
      year,
    });
  }
}
