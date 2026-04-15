import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantModulesService } from './tenant-modules.service';

@Controller('tenant-modules')
@UseGuards(JwtAuthGuard)
export class TenantModulesController {
  constructor(private readonly service: TenantModulesService) {}

  @Get()
  getMyTenantModules(@Req() req: any) {
    return this.service.getModules(req.user.tenantId);
  }

  @Patch()
  updateMyTenantModules(
    @Req() req: any,
    @Body()
    body: {
      sale?: boolean;
      rental?: boolean;
      yango?: boolean;
    },
  ) {
    return this.service.bulkUpdateModules(req.user.tenantId, body);
  }

  @Patch(':sector')
  updateOneSector(
    @Req() req: any,
    @Param('sector') sector: 'sale' | 'rental' | 'yango',
    @Body() body: { isEnabled: boolean },
  ) {
    return this.service.updateModule(
      req.user.tenantId,
      sector,
      !!body.isEnabled,
    );
  }
}
