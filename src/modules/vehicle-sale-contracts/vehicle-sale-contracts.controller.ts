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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleSaleContractsService } from './vehicle-sale-contracts.service';
import { Response } from 'express';

@Controller('vehicle-sale-contracts')
@UseGuards(JwtAuthGuard)
export class VehicleSaleContractsController {
  constructor(private readonly service: VehicleSaleContractsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @Post(':id/payments')
  addPayment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.addPayment(req.user.tenantId, id, body);
  }

  @Get(':id/receipt')
  async receipt(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.service.buildReceiptHtml(req.user.tenantId, id);

    const doc = new Print({
      margin: 40,
      size: 'A4',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=vente-${id}.pdf`,
    );

    doc.pipe(res);

    doc.font('Helvetica');
    doc.fontSize(10);

    const chunks = html
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<\/(p|div|tr|h1|h2|h3|table|thead|tbody)>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    chunks.forEach((line) => {
      doc.text(line, {
        width: 520,
        align: 'left',
      });
      doc.moveDown(0.35);
    });

    doc.end();
  }
}
