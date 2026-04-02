import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
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
  rejectRequest(@Param('id') id: string) {
    return this.adminService.rejectRequest(id);
  }

  @Get('tenants')
  getTenants() {
    return this.adminService.getTenants();
  }

  @Patch('tenants/:id')
  updateTenant(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      sector?: string;
      isActive?: boolean;
    },
  ) {
    return this.adminService.updateTenant(id, body);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  @Patch('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string) {
    return this.adminService.suspendTenant(id);
  }

  @Patch('tenants/:id/reactivate')
  reactivateTenant(@Param('id') id: string) {
    return this.adminService.reactivateTenant(id);
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Post('subscriptions')
  createSubscription(
    @Body()
    body: {
      tenantId: string;
      planId: string;
    },
  ) {
    return this.adminService.createSubscription(body);
  }

  @Patch('subscriptions/:id')
  updateSubscription(
    @Param('id') id: string,
    @Body()
    body: {
      planId?: string;
      status?: 'pending' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
      startDate?: string | Date | null;
      endDate?: string | Date | null;
      autoRenew?: boolean;
    },
  ) {
    return this.adminService.updateSubscription(id, body);
  }

  @Delete('subscriptions/:id')
  deleteSubscription(@Param('id') id: string) {
    return this.adminService.deleteSubscription(id);
  }

  @Get('plans')
  getPlans() {
    return this.adminService.getPlans();
  }
}
