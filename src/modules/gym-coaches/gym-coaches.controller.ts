import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GymCoachesService } from './gym-coaches.service';

@Controller('gym-coaches')
export class GymCoachesController {
  constructor(private readonly service: GymCoachesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    const coaches = await this.service.findAll(tenantId);

    return coaches.map((coach: any) => ({
      ...coach,
      displayName:
        coach.name ||
        coach.fullName ||
        `${coach.firstName || ''} ${coach.lastName || ''}`.trim() ||
        coach.email ||
        'Coach',
    }));
  }
  @Patch(':id')
update(
  @Param('id') id: string,
  @Query('tenantId') tenantId: string,
  @Body() body: any,
) {
  return this.service.update(id, tenantId, body);
}

  @Post()
  async create(
    @Query('tenantId') tenantId: string,
    @Body()
    body: {
      name: string;
      specialty?: string;
      phone?: string;
      email?: string;
    },
  ) {
    return this.service.create(tenantId, body);
  }
}
