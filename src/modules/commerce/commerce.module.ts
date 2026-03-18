import { Module } from '@nestjs/common';

import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';

import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';

import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';

import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';

@Module({
  controllers: [
    CategoriesController,
    ProductsController,
    SalesController,
    PaymentsController,
    DashboardController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    SalesService,
    PaymentsService,
    DashboardService,
  ],
})
export class CommerceModule {}
