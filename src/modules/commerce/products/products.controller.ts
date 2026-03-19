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

  @Get('search')
  search(@Query('tenantId') tenantId: string, @Query('q') q: string) {
    return this.productsService.search(tenantId, q);
  }

  @Get('barcode/:barcode')
  findByBarcode(
    @Param('barcode') barcode: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productsService.findByBarcode(barcode, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      price?: number;
      stock?: number;
      categoryId?: string | null;
      barcode?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.productsService.update(id, body);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.productsService.activate(id);
  }
}
