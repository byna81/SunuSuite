import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { TenantSector } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapSectorToTenantSector(sector?: string | null): TenantSector | null {
    if (!sector) return null;

    if (sector === 'sale') return 'sale';
    if (sector === 'rental') return 'rental';
    if (sector === 'yango') return 'yango';

    return null; // ⚠️ IMPORTANT → on ignore "commerce"
  }

  private async enableTenantModuleIfSupported(
    tenantId: string,
    sector?: string | null,
  ) {
    const tenantSector = this.mapSectorToTenantSector(sector);

    if (!tenantSector) return;

    const existing = await this.prisma.tenantModule.findFirst({
      where: {
        tenantId,
        sector: tenantSector,
      },
    });

    if (existing) {
      return this.prisma.tenantModule.update({
        where: { id: existing.id },
        data: {
          isEnabled: true,
          activatedAt: new Date(),
          expiresAt: null,
        },
      });
    }

    return this.prisma.tenantModule.create({
      data: {
        tenantId,
        sector: tenantSector,
        isEnabled: true,
      },
    });
  }

  async createSubscription(payload: { tenantId: string; planId: string }) {
    const { tenantId, planId } = payload;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant introuvable');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);

    if (plan.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'active',
        startDate,
        endDate,
        lastPaymentAt: startDate,
      },
      include: {
        tenant: true,
        plan: true,
      },
    });

    // ✅ activation module (SAFE)
    await this.enableTenantModuleIfSupported(tenantId, plan.sector);

    // ✅ update tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: true,
        sector: plan.sector,
      },
    });

    return {
      message: 'Abonnement créé avec succès',
      subscription,
    };
  }

  async validateRequest(request: any) {
    const hashedPassword = await bcrypt.hash('SunuSuite1234', 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: request.companyName,
        email: request.email,
        phone: request.phone,
        sector: request.sector || 'commerce',
        isActive: true,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: request.email,
        password: hashedPassword,
        tenantId: tenant.id,
        role: 'manager',
        fullName: request.ownerName,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const tenantSector = this.mapSectorToTenantSector(request.sector);

    if (tenantSector) {
      await this.prisma.tenantModule.create({
        data: {
          tenantId: tenant.id,
          sector: tenantSector,
          isEnabled: true,
        },
      });
    }

    return {
      message: 'Demande validée',
      tenant,
      user,
    };
  }

  async suspendTenant(tenantId: string) {
    const now = new Date();

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    await this.prisma.user.updateMany({
      where: { tenantId },
      data: { isActive: false },
    });

    await this.prisma.tenantModule.updateMany({
      where: { tenantId },
      data: {
        isEnabled: false,
        expiresAt: now,
      },
    });

    return { message: 'Tenant suspendu' };
  }

  async reactivateTenant(tenantId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: true },
    });

    await this.prisma.user.updateMany({
      where: { tenantId },
      data: { isActive: true },
    });

    await this.prisma.tenantModule.updateMany({
      where: { tenantId },
      data: {
        isEnabled: true,
        expiresAt: null,
      },
    });

    return { message: 'Tenant réactivé' };
  }
}
