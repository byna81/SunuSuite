import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CommerceAccountingService } from './commerce-accounting.service';

@Controller('commerce/accounting')
export class CommerceAccountingController {
  constructor(
    private readonly commerceAccountingService: CommerceAccountingService,
  ) {}

  @Post('expenses')
  createExpense(
    @Body()
    body: {
      tenantId: string;
      label: string;
      category: string;
      amount: number;
      expenseDate?: string;
      paymentMethod?: string;
      note?: string;
    },
  ) {
    return this.commerceAccountingService.createExpense(body);
  }

  @Get('expenses')
  getExpenses(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.commerceAccountingService.getExpenses({
      tenantId,
      month,
      year,
    });
  }

  @Delete('expenses/:id')
  deleteExpense(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.commerceAccountingService.deleteExpense(id, tenantId);
  }

  @Get('summary')
  getSummary(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.commerceAccountingService.getSummary({
      tenantId,
      month,
      year,
    });
  }
}
