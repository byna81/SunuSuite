import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('commerce/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body()
    body: {
      tenantId: string;
      items: { productId: string; quantity: number }[];
    },
    @Req() req: any,
  ) {
    return this.salesService.create({
      tenantId: body.tenantId,
      items: body.items,
      cashierId: req?.user?.role === 'cashier' ? req.user.id : null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.salesService.findAll(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
