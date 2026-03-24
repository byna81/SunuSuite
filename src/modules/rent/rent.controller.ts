import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RentService } from './rent.service';

@Controller('rents')
export class RentController {
  constructor(private readonly service: RentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('select/active-tenants')
  findActiveTenantsForRent(@Req() req: any) {
    return this.service.findActiveTenantsForRent(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/pay')
  pay(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.pay(req.user.tenantId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/mark-late')
  markLate(@Req() req: any, @Param('id') id: string) {
    return this.service.markLate(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/notice-pdf')
  async noticePdf(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getNoticePdf(req.user.tenantId, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=avis-echeance.pdf',
    });

    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/receipt-pdf')
  async receiptPdf(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getReceiptPdf(req.user.tenantId, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=quittance-loyer.pdf',
    });

    res.send(buffer);
  }
}
