import { Body, Controller, Get, Post } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('requests')
  getRequests() {
    return this.adminService.getRequests();
  }

  @Post('requests/approve')
  approve(@Body() body: any) {
    return this.adminService.approveBusinessRequest(body);
  }

  @Post('requests/reject')
  reject(@Body() body: any) {
    return this.adminService.rejectBusinessRequest(body);
  }

  @Get('tenants')
  getTenants() {
    return this.adminService.getTenants();
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('plans')
  getPlans() {
    return this.adminService.getPlans();
  }
}
