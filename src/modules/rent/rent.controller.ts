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
import { RentService } from './rent.service';

@Controller('rents')
export class RentController {
  constructor(private readonly service: RentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/pay')
  pay(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.pay(req.user.tenantId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/mark-late')
  markLate(@Req() req: any, @Param('id') id: string) {
    return this.service.markLate(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('select/active-tenants')
  findActiveTenantsForRent(@Req() req: any) {
    return this.service.findActiveTenantsForRent(req.user.tenantId);
  }
}
