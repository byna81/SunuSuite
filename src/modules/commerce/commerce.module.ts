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

// Payments
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';

@Module({
  controllers: [
    CategoriesController,
    ProductsController,
    SalesController,
    PaymentsController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    SalesService,
    PaymentsService,
  ],
})
export class CommerceModule {}
