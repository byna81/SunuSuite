import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContractService } from './contract.service';

@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.contractService.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('select-data')
  getSelectData(@Req() req: any) {
    return this.contractService.getSelectData(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.contractService.create(req.user.tenantId, body);
  }
}
