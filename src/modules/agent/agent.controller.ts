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
import { AgentService } from './agent.service';

@Controller('agents')
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(req.user, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-active')
  toggleActive(@Req() req: any, @Param('id') id: string) {
    return this.service.toggleActive(req.user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reset-password')
  resetPassword(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.resetPassword(req.user, id, body);
  }
}
