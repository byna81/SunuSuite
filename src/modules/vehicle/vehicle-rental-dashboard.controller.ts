import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleRentalDashboardService } from './vehicle-rental-dashboard.service';

@Controller('vehicle-rental-dashboard')
@UseGuards(JwtAuthGuard)
export class VehicleRentalDashboardController {
  constructor(private service: VehicleRentalDashboardService) {}

  @Get()
  getDashboard(@Req() req: any, @Query('period') period: string) {
    return this.service.getDashboard(
      req.user.tenantId,
      period || 'today',
    );
  }
}
