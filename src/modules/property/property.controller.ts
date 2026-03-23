import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('properties')
export class PropertyController {
  constructor(private service: PropertyService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('select')
  findPropertiesForSelect(@Req() req: any) {
    return this.service.findPropertiesForSelect(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenants')
  findAllTenants(@Req() req: any) {
    return this.service.findAllTenants(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tenants')
  createTenant(@Req() req: any, @Body() body: any) {
    return this.service.createTenant(req.user.tenantId, body);
  }
}
