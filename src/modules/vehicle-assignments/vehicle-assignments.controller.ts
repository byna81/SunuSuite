import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VehicleAssignmentsService } from './vehicle-assignments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('vehicle-assignments')
@UseGuards(JwtAuthGuard)
export class VehicleAssignmentsController {
  constructor(private readonly service: VehicleAssignmentsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch(':id/unassign')
  unassign(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.unassign(req.user.tenantId, id, body);
  }
}
