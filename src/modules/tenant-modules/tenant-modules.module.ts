import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantModulesController } from './tenant-modules.controller';
import { TenantModulesService } from './tenant-modules.service';

@Module({
  imports: [PrismaModule],
  controllers: [TenantModulesController],
  providers: [TenantModulesService],
  exports: [TenantModulesService],
})
export class TenantModulesModule {}
