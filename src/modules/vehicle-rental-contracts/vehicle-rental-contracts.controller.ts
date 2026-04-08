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
import { VehicleRentalContractsService } from './vehicle-rental-contracts.service';

@Controller('vehicle-rental-contracts')
@UseGuards(JwtAuthGuard)
export class VehicleRentalContractsController {
  constructor(private readonly service: VehicleRentalContractsService) {}

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

  @Post(':id/extend')
  extendContract(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.extendContract(req.user.tenantId, id, body);
  }

  @Post(':id/return')
  registerReturn(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.registerReturn(req.user.tenantId, id, body);
  }
}
