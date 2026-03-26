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
import { ContractService } from './contract.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.contractService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.contractService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.contractService.create(req.user.tenantId, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.contractService.update(req.user.tenantId, id, body);
  }

  @Patch(':id/terminate')
  terminate(@Req() req: any, @Param('id') id: string) {
    return this.contractService.terminate(req.user.tenantId, id);
  }

  @Get('smart-owner-payment/:propertyId')
  smartOwnerPayment(@Req() req: any, @Param('propertyId') propertyId: string) {
    return this.contractService.findSmartOwnerPaymentData(
      req.user.tenantId,
      propertyId,
    );
  }
}
