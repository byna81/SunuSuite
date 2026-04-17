import {
  Controller,
  ForbiddenException,
  Get,
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
}
