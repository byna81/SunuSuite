import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
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

  @UseGuards(JwtAuthGuard)
  @Patch('tenants/:id/checkout')
  checkoutTenant(@Req() req: any, @Param('id') id: string) {
    return this.service.checkoutTenant(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner-payments')
  findAllOwnerPayments(@Req() req: any) {
    return this.service.findAllOwnerPayments(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner-payments/select')
  findOwnerPaymentsSelect(@Req() req: any) {
    return this.service.findOwnerPaymentsSelect(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('owner-payments')
  createOwnerPayment(@Req() req: any, @Body() body: any) {
    return this.service.createOwnerPayment(
      req.user.tenantId,
      req.user.login || req.user.email || 'Utilisateur',
      body,
    );
  }
}
