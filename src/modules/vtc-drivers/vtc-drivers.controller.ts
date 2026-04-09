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
  UseGuards,
} from '@nestjs/common';
import { VtcDriversService } from './vtc-drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('vtc-drivers')
@UseGuards(JwtAuthGuard)
export class VtcDriversController {
  constructor(private readonly service: VtcDriversService) {}

  @Get()
  findAll(@Req() req: any, @Query('status') status?: string) {
    return this.service.findAll(req.user.tenantId, status);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(req.user.tenantId, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, id);
  }
}
