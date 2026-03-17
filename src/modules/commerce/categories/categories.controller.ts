import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('commerce/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() body: { tenantId: string; name: string }) {
    return this.categoriesService.create(body);
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }
}
