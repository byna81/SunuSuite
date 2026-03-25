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
}
