import { Controller, Get, Query } from '@nestjs/common';
import { GymDashboardService } from './gym-dashboard.service';

@Controller('gym/dashboard')
export class GymDashboardController {
  constructor(private readonly service: GymDashboardService) {}

  @Get()
  getDashboard(
    @Query('tenantId') tenantId: string,
    @Query('period') period: 'today' | 'week' | 'month' = 'today',
  ) {
    return this.service.getDashboard(tenantId, period);
  }

  @Get('late-subscriptions')
  getLateSubscriptions(@Query('tenantId') tenantId: string) {
    return this.service.getLateSubscriptions(tenantId);
  }
}
