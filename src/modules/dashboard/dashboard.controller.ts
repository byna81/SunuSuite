import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('real-estate')
  getRealEstateDashboard(@Req() req: any) {
    return this.service.getRealEstateDashboard(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sale')
  getSaleDashboard(@Req() req: any) {
    return this.service.getSaleDashboard(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('rental')
  getRentalDashboard(@Req() req: any) {
    return this.service.getRentalDashboard(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('yango')
  getYangoDashboard(@Req() req: any) {
    return this.service.getYangoDashboard(req.user.tenantId);
  }
}
