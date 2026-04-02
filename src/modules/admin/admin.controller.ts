import { Controller, Get, Param, Patch } from '@nestjs/common';
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

  @Patch('requests/:id/validate')
  validateRequest(@Param('id') id: string) {
    return this.adminService.validateRequest(id);
  }

  @Patch('requests/:id/reject')
reject(@Param('id') id: string) {
  return this.adminService.rejectRequest(id);
}

@Patch('tenants/:id/suspend')
suspend(@Param('id') id: string) {
  return this.adminService.suspendTenant(id);
}

@Patch('tenants/:id/reactivate')
reactivate(@Param('id') id: string) {
  return this.adminService.reactivateTenant(id);
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
