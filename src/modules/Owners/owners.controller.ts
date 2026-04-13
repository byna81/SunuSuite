import {
  Controller,
  Get,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { OwnersService } from './owners.service';

@Controller('owners')
export class OwnersController {
  constructor(private readonly service: OwnersService) {}

  @Get()
findAll(@Query('tenantId') tenantId: string) {
  if (!tenantId) {
    throw new BadRequestException('tenantId requis');
  }

  return this.ownersService.findAll(tenantId);
}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, body);
  }
}
