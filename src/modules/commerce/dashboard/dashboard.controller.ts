import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('commerce/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSummary({
      tenantId,
      period,
      startDate,
      endDate,
    });
  }

  @Get('top-products')
  getTopProducts(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getTopProducts({
      tenantId,
      period,
      startDate,
      endDate,
    });
  }

  @Get('sales-by-cashier')
  getSalesByCashier(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSalesByCashier({
      tenantId,
      period,
      startDate,
      endDate,
    });
  }

  @Get('sales-by-cashier-daily')
  getSalesByCashierDaily(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSalesByCashierDaily({
      tenantId,
      period,
      startDate,
      endDate,
    });
  }
}
