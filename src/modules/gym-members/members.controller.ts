import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { GymMembersService } from './gym-members.service';

@Controller('gym-members')
export class GymMembersController {
  constructor(private readonly gymMembersService: GymMembersService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
  ) {
    return this.gymMembersService.findAll(tenantId, search);
  }

  @Get(':id')
  findOne(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.gymMembersService.findOne(tenantId, id);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
    },
  ) {
    return this.gymMembersService.create(tenantId, body);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      email?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.gymMembersService.update(tenantId, id, body);
  }

  @Delete(':id')
  remove(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.gymMembersService.remove(tenantId, id);
  }
}
