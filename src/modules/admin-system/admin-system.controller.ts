import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminSystemService } from './admin-system.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminSystemController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  private checkAdmin(user: any) {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
  }

  @Get('me')
  async me(@Req() req: any) {
    this.checkAdmin(req.user);

    return {
      message: 'Accès admin autorisé',
      user: req.user,
    };
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getStats();
  }

  @Get('business-requests')
  async getBusinessRequests(
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getBusinessRequests(status);
  }

  @Patch('business-requests/:id/approve')
  async approveBusinessRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.checkAdmin(req.user);
    return this.adminSystemService.approveBusinessRequest(id, body);
  }

  @Patch('business-requests/:id/reject')
  async rejectBusinessRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.checkAdmin(req.user);
    return this.adminSystemService.rejectBusinessRequest(id, body);
  }

  @Get('tenants')
  async getTenants(@Req() req: any) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getTenants();
  }

  @Get('tenants/:id')
  async getTenantById(@Req() req: any, @Param('id') id: string) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getTenantById(id);
  }

  @Patch('tenants/:id/toggle-active')
  async toggleTenantActive(@Req() req: any, @Param('id') id: string) {
    this.checkAdmin(req.user);
    return this.adminSystemService.toggleTenantActive(id);
  }

  @Get('plans')
  async getPlans(@Req() req: any) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getPlans();
  }

  @Post('plans')
  async createPlan(@Req() req: any, @Body() body: any) {
    this.checkAdmin(req.user);
    return this.adminSystemService.createPlan(body);
  }

  @Patch('plans/:id')
  async updatePlan(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.checkAdmin(req.user);
    return this.adminSystemService.updatePlan(id, body);
  }

  @Patch('plans/:id/toggle-active')
  async togglePlanActive(@Req() req: any, @Param('id') id: string) {
    this.checkAdmin(req.user);
    return this.adminSystemService.togglePlanActive(id);
  }

  @Get('subscriptions')
  async getSubscriptions(@Req() req: any) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getSubscriptions();
  }

  @Get('users')
  async getUsers(@Req() req: any) {
    this.checkAdmin(req.user);
    return this.adminSystemService.getUsers();
  }
}
