import {
  Body,
  Controller,
  Delete,
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
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.contractService.findOne(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.contractService.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.contractService.update(req.user.tenantId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/activate')
  activate(@Req() req: any, @Param('id') id: string) {
    return this.contractService.activate(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/terminate')
  terminate(@Req() req: any, @Param('id') id: string) {
    return this.contractService.terminate(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.contractService.remove(req.user.tenantId, id);
  }
}
