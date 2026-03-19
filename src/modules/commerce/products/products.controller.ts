import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('commerce/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Body()
    body: {
      tenantId: string;
      categoryId?: string;
      name: string;
      price: number;
      stock?: number;
      isActive?: boolean;
      barcode?: string;
    },
  ) {
    return this.productsService.create(body);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.productsService.findAll(tenantId);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }
}
