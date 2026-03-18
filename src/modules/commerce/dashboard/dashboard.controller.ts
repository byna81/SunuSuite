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
    return this.dashboardService.getSummary(
      tenantId,
      period,
      startDate,
      endDate,
    );
  }

  @Get('top-products')
  getTopProducts(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getTopProducts(
      tenantId,
      period,
      startDate,
      endDate,
    );
  }

  @Get('sales')
  getSales(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSales(
      tenantId,
      period,
      startDate,
      endDate,
    );
  }
}
