import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RealEstateAccountingService } from './real-estate-accounting.service';

@Controller('real-estate/accounting')
export class RealEstateAccountingController {
  constructor(
    private readonly realEstateAccountingService: RealEstateAccountingService,
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
    return this.realEstateAccountingService.createExpense(body);
  }

  @Get('expenses')
  getExpenses(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.realEstateAccountingService.getExpenses({
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
    return this.realEstateAccountingService.deleteExpense(id, tenantId);
  }

  @Get('summary')
  getSummary(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.realEstateAccountingService.getSummary({
      tenantId,
      month,
      year,
    });
  }

  @Get('export/pdf')
  exportPdf(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.realEstateAccountingService.exportPdf({
      tenantId,
      month,
      year,
    });
  }

  @Get('export/excel')
  exportExcel(
    @Query('tenantId') tenantId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.realEstateAccountingService.exportExcel({
      tenantId,
      month,
      year,
    });
  }
}
