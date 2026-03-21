import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-manager')
  registerManager(
    @Body()
    body: {
      boutiqueName: string;
      email: string;
      password: string;
    },
  ) {
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
  forgotPassword(
    @Body()
    body: {
      email: string;
    },
  ) {
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
    return this.authService.registerCashier(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { user: req.user };
  }
}
