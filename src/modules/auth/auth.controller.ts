import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterManagerDto } from './dto/register-manager.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCashierDto } from './dto/register-cashier.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-manager')
  registerManager(@Body() body: RegisterManagerDto) {
    return this.authService.registerManager(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  @Post('register-cashier')
  registerCashier(@Req() req: any, @Body() body: RegisterCashierDto) {
    return this.authService.registerCashier(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return {
      user: req.user,
    };
  }
}
