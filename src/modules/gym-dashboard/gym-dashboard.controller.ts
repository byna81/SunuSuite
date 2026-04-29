import { Controller, Get, Query } from '@nestjs/common';
import { GymDashboardService } from './gym-dashboard.service';

@Controller('gym/dashboard')
export class GymDashboardController {
  constructor(private readonly service: GymDashboardService) {}

  @Get()
  getDashboard(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.service.getDashboard(tenantId);
  }
}
