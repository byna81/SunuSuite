import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GymCoursesService } from './gym-courses.service';

@Controller('gym-courses')
export class GymCoursesController {
  constructor(private readonly service: GymCoursesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  update(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Patch(':id/activate')
  activate(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.setActive(tenantId, id, true);
  }

  @Patch(':id/deactivate')
  deactivate(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.setActive(tenantId, id, false);
  }

  @Delete(':id')
  remove(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
