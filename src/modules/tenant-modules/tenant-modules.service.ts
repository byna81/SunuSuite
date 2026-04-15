import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALL_SECTORS = ['sale', 'rental', 'yango'] as const;
type TenantSector = (typeof ALL_SECTORS)[number];

@Injectable()
export class TenantModulesService {
  constructor(private prisma: PrismaService) {}

  async ensureDefaultModules(tenantId: string) {
    for (const sector of ALL_SECTORS) {
      await this.prisma.tenantModule.upsert({
        where: {
          tenantId_sector: {
            tenantId,
            sector,
          },
        },
        update: {},
        create: {
          tenantId,
          sector,
          isEnabled: false,
        },
      });
    }
  }

  async getModules(tenantId: string) {
    await this.ensureDefaultModules(tenantId);

    const modules = await this.prisma.tenantModule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      tenantId,
      modules,
    };
  }

  async updateModule(
    tenantId: string,
    sector: TenantSector,
    isEnabled: boolean,
  ) {
    await this.ensureDefaultModules(tenantId);

    const updated = await this.prisma.tenantModule.upsert({
      where: {
        tenantId_sector: {
          tenantId,
          sector,
        },
      },
      update: {
        isEnabled,
        activatedAt: isEnabled ? new Date() : null,
      },
      create: {
        tenantId,
        sector,
        isEnabled,
        activatedAt: isEnabled ? new Date() : null,
      },
    });

    return updated;
  }

  async bulkUpdateModules(
    tenantId: string,
    payload: {
      sale?: boolean;
      rental?: boolean;
      yango?: boolean;
    },
  ) {
    await this.ensureDefaultModules(tenantId);

    const updates: Promise<any>[] = [];

    if (typeof payload.sale === 'boolean') {
      updates.push(this.updateModule(tenantId, 'sale', payload.sale));
    }

    if (typeof payload.rental === 'boolean') {
      updates.push(this.updateModule(tenantId, 'rental', payload.rental));
    }

    if (typeof payload.yango === 'boolean') {
      updates.push(this.updateModule(tenantId, 'yango', payload.yango));
    }

    await Promise.all(updates);

    return this.getModules(tenantId);
  }

  async isSectorEnabled(tenantId: string, sector: TenantSector) {
    const moduleRow = await this.prisma.tenantModule.findUnique({
      where: {
        tenantId_sector: {
          tenantId,
          sector,
        },
      },
    });

    return !!moduleRow?.isEnabled;
  }

  async getEnabledSectors(tenantId: string) {
    await this.ensureDefaultModules(tenantId);

    const rows = await this.prisma.tenantModule.findMany({
      where: {
        tenantId,
        isEnabled: true,
      },
      select: {
        sector: true,
      },
    });

    return rows.map((row) => row.sector);
  }
}
