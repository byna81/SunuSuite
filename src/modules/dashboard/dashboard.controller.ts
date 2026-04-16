import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
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

  @UseGuards(JwtAuthGuard)
  @Get('accounting')
  getAccountingDashboard(@Req() req: any) {
    return this.service.getAccountingDashboard(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounting/export/pdf')
  async exportAccountingPdf(@Req() req: any, @Res() res: Response) {
    const buffer = await this.service.exportAccountingPdf(req.user.tenantId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comptabilite-transport.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounting/export/excel')
  async exportAccountingExcel(@Req() req: any, @Res() res: Response) {
    const buffer = await this.service.exportAccountingExcel(req.user.tenantId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="comptabilite-transport.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
