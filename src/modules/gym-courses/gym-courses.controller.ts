import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { GymCoursesService } from './gym-courses.service';

@Controller('gym-courses')
export class GymCoursesController {
  constructor(private readonly service: GymCoursesService) {}

  @Get()
  getAll(@Query('tenantId') tenantId: string) {
    return this.service.getAll(tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.service.update(id, tenantId, body);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.activate(id, tenantId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.deactivate(id, tenantId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.delete(id, tenantId);
  }
}
