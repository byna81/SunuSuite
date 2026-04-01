import { Body, Controller, Get, Post } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Post('business-requests/approve')
  approveBusinessRequest(@Body() body: any) {
    return this.service.approveBusinessRequest(body);
  }

  @Post('business-requests/reject')
  rejectBusinessRequest(@Body() body: any) {
    return this.service.rejectBusinessRequest(body);
  }
}
