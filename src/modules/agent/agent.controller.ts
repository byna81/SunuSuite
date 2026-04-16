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
import { AgentService } from './agent.service';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.agentService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.agentService.findOne(req.user, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.agentService.create(req.user, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.agentService.update(req.user, id, body);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Req() req: any, @Param('id') id: string) {
    return this.agentService.toggleActive(req.user, id);
  }

  @Patch(':id/reset-password')
  resetPassword(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.agentService.resetPassword(req.user, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.agentService.delete(req.user, id);
  }
}
