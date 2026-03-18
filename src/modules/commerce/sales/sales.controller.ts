import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('commerce/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() body: { tenantId: string; items: { productId: string; quantity: number }[] }) {
    return this.salesService.create(body);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.salesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
