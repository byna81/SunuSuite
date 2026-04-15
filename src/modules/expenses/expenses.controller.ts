import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private getTenantId(req: any, tenantIdFromQuery?: string) {
    return (
      req?.user?.tenantId ||
      tenantIdFromQuery ||
      req?.query?.tenantId ||
      ''
    );
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Query('module') module?: string,
  ) {
    return this.expensesService.findAll(
      this.getTenantId(req, tenantId),
      module,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.expensesService.findOne(this.getTenantId(req, tenantId), id);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: any,
    @Query('tenantId') tenantId: string,
  ) {
    return this.expensesService.create(this.getTenantId(req, tenantId), body);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
    @Query('tenantId') tenantId: string,
  ) {
    return this.expensesService.update(
      this.getTenantId(req, tenantId),
      id,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.expensesService.remove(this.getTenantId(req, tenantId), id);
  }
}
