import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BusinessRequestsService } from './business-requests.service';

@Controller('business-requests')
export class BusinessRequestsController {
  constructor(private readonly service: BusinessRequestsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'approved' | 'rejected' },
  ) {
    return this.service.updateStatus(id, body.status);
  }
}
