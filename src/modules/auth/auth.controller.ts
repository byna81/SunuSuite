import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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

  @Post('login')
  login(
    @Body()
    body: {
      identifier: string;
      password: string;
    },
  ) {
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
    return this.authService.changePassword(
      req.user.sub,
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
