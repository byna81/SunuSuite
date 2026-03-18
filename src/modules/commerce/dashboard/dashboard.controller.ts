import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('commerce/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query('tenantId') tenantId: string) {
    return this.dashboardService.getSummary(tenantId);
  }

  @Get('top-products')
  getTopProducts(@Query('tenantId') tenantId: string) {
    return this.dashboardService.getTopProducts(tenantId);
  }

  @Get('today-sales')
  getTodaySales(@Query('tenantId') tenantId: string) {
    return this.dashboardService.getTodaySales(tenantId);
  }
}
