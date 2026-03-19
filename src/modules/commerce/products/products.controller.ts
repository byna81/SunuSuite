import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('commerce/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get('search')
  search(
    @Query('tenantId') tenantId: string,
    @Query('q') q: string,
  ) {
    return this.service.search(tenantId, q);
  }

  @Get('barcode/:barcode')
  findByBarcode(
    @Param('barcode') barcode: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.findByBarcode(barcode, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  // 🔥 AJOUT STOCK
  @Post(':id/stock/add')
  addStock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ) {
    return this.service.addStock(id, body.quantity);
  }
}
