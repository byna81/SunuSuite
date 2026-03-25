import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerPaymentService } from './owner-payment.service';

@Controller('owner-payments')
export class OwnerPaymentController {
  constructor(private readonly service: OwnerPaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('select')
  getCreateData(@Req() req: any) {
    return this.service.getCreateData(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    const paidBy =
      req.user?.email ||
      req.user?.login ||
      req.user?.name ||
      req.user?.id ||
      'Utilisateur';

    return this.service.create(req.user.tenantId, paidBy, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/pdf')
  async pdf(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getPdf(req.user.tenantId, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=versement-proprietaire.pdf',
    });

    res.send(buffer);
  }
}
