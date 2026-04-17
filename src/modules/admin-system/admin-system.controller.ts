import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AdminSystemService } from './admin-system.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminSystemController {
  constructor(private readonly adminService: AdminSystemService) {}

  // 🔒 Vérification simple
  private checkAdmin(user: any) {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
  }

  // ✅ Exemple route sécurisée
  @Get('tenants')
  async getTenants(@Req() req) {
    this.checkAdmin(req.user);
    return this.adminService.getTenants();
  }

  // ✅ Exemple validation demande
  @Post('approve-request')
  async approve(@Req() req, @Body() body) {
    this.checkAdmin(req.user);
    return this.adminService.approveRequest(body);
  }
}
