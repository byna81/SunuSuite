import { Module } from '@nestjs/common';

// Categories
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';

// Products
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

// Sales
import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';

@Module({
  controllers: [
    CategoriesController,
    ProductsController,
    SalesController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    SalesService,
  ],
})
export class CommerceModule {}
