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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PropertyService } from './property.service';

@Controller('properties')
@UseGuards(JwtAuthGuard)
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.propertyService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.propertyService.findAll(req.user.tenantId);
  }

  @Get('select')
  findPropertiesForSelect(@Req() req: any) {
    return this.propertyService.findPropertiesForSelect(req.user.tenantId);
  }

  @Get('tenants')
  findAllTenants(@Req() req: any) {
    return this.propertyService.findAllTenants(req.user.tenantId);
  }

  @Post('tenants')
  createTenant(@Req() req: any, @Body() body: any) {
    return this.propertyService.createTenant(req.user.tenantId, body);
  }

  @Patch('tenants/:id/checkout')
  checkoutTenant(@Req() req: any, @Param('id') id: string) {
    return this.propertyService.checkoutTenant(req.user.tenantId, id);
  }

  @Post('owner-payments')
  createOwnerPayment(@Req() req: any, @Body() body: any) {
    return this.propertyService.createOwnerPayment(req.user.tenantId, body);
  }

  @Get(':id/owner-payments')
  findPropertyOwnerPayments(@Req() req: any, @Param('id') id: string) {
    return this.propertyService.findPropertyOwnerPayments(req.user.tenantId, id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.propertyService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.propertyService.update(req.user.tenantId, id, body);
  }
}
