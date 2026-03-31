import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleSaleContractsService } from './vehicle-sale-contracts.service';

@Controller('vehicle-sale-contracts')
@UseGuards(JwtAuthGuard)
export class VehicleSaleContractsController {
  constructor(private readonly service: VehicleSaleContractsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }

  @Post(':id/payments')
  addPayment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.addPayment(req.user.tenantId, id, body);
  }
}
