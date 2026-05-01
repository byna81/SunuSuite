import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GymExpensesService } from './gym-expenses.service';

@Controller('gym-expenses')
export class GymExpensesController {
  constructor(private readonly service: GymExpensesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id/correct')
  correct(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.service.correct(id, tenantId, body);
  }
}
