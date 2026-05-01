import {
  BadRequestException,
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
import { GymCoursesService } from './gym-courses.service';


@Controller('gym-courses')
export class GymCoursesController {
  constructor(private readonly service: GymCoursesService) {}

  // =============================
  // GET ALL COURSES
  // =============================
  @Get()
  async getAll(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.service.getAll(tenantId);
  }

  // =============================
  // CREATE COURSE
  // =============================
  @Post()
  async create(
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.service.create(tenantId, body);
  }
  
  // =============================
  // Participer cours 
  // =============================

@Post(':id/book')
bookCourse(
  @Param('id') courseId: string,
  @Query('tenantId') tenantId: string,
  @Req() req: any,
  @Body() body: any,
) {
  return this.service.bookCourse(
    courseId,
    tenantId,
    req.user?.id,
    body.memberId,
  );
}

  @Delete(':id/book')
unbookCourse(
  @Param('id') courseId: string,
  @Query('tenantId') tenantId: string,
  @Req() req: any,
  @Body() body: any,
) {
  return this.service.unbookCourse(
    courseId,
    tenantId,
    req.user?.id,
    body.memberId,
  );
}
  // =============================
  // UPDATE COURSE
  // =============================
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!id) {
      throw new BadRequestException('id obligatoire');
    }

    return this.service.update(id, tenantId, body);
  }

  // =============================
  // ACTIVATE COURSE
  // =============================
  @Patch(':id/activate')
  async activate(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.service.activate(id, tenantId);
  }

  // =============================
  // DEACTIVATE COURSE
  // =============================
  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.service.deactivate(id, tenantId);
  }

  // =============================
  // DELETE COURSE
  // =============================
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!id) {
      throw new BadRequestException('id obligatoire');
    }

    return this.service.delete(id, tenantId);
  }
}
