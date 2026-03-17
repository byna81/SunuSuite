import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
    },
  ) {
    return this.productsService.create(body);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.productsService.findAll(tenantId);
  }
}
