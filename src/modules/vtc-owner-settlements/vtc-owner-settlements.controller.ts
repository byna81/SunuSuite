import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VtcOwnerSettlementsService } from './vtc-owner-settlements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('vtc-owner-settlements')
@UseGuards(JwtAuthGuard)
export class VtcOwnerSettlementsController {
  constructor(private readonly service: VtcOwnerSettlementsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query('status') status?: string) {
    return this.service.findAll(tenantId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
}
