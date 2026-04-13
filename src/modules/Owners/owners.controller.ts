import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OwnersService } from './owners.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('owners')
@UseGuards(JwtAuthGuard)
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId requis');
    }

    return this.ownersService.findAll(tenantId.trim());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post()
  create(@Body() body: any) {
    if (!body?.tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.ownersService.create(body.tenantId.trim(), body);
  }
}
