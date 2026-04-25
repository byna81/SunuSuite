import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-manager')
  registerManager(@Body() body: any) {
    return this.authService.registerManager(body);
  }

  @Post('staff')
  createStaff(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.authService.registerStaff(tenantId, body);
  }

  @Get('staff')
  getStaff(@Query('tenantId') tenantId: string) {
    return this.authService.getStaff(tenantId);
  }

  @Patch('staff/:id')
  updateStaff(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.authService.updateStaff(tenantId, id, body);
  }

  @Patch('staff/:id/activate')
  activateStaff(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.authService.activateStaff(tenantId, id);
  }

  @Patch('staff/:id/deactivate')
  deactivateStaff(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.authService.deactivateStaff(tenantId, id);
  }

  @Patch('staff/:id/reset-password')
  resetStaffPassword(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.authService.resetStaffPassword(tenantId, id);
  }

  @Delete('staff/:id')
  deleteStaff(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.authService.deleteStaff(tenantId, id);
  }

  @Post('login')
  login(@Body() body: { identifier: string; password: string }) {
    return this.authService.login(body.identifier, body.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(
    @Body()
    body: {
      email: string;
      code: string;
      newPassword: string;
    },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() req: any,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId || null;

    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post('register-cashier')
  registerCashier(
    @Req() req: any,
    @Body()
    body: {
      login: string;
      password: string;
    },
  ) {
    return this.authService.registerCashier(
      req.user.tenantId,
      body.login,
      body.password,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Get('cashiers')
  getCashiers(@Req() req: any) {
    return this.authService.getCashiers(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch('cashiers/:id/reset-password')
  resetCashierPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    return this.authService.resetCashierPassword(
      req.user.tenantId,
      id,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Patch('cashiers/:id/deactivate')
  deactivateCashier(@Req() req: any, @Param('id') id: string) {
    return this.authService.deactivateCashier(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return {
      user: req.user,
    };
  }
}
