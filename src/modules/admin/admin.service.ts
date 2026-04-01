import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private addPeriod(startDate: Date, billingCycle: 'monthly' | 'yearly') {
    const endDate = new Date(startDate);

    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  async approveBusinessRequest(body: {
    businessRequestId: string;
    planId: string;
    managerPassword?: string;
    autoRenew?: boolean;
  }) {
    const request = await this.prisma.businessRequest.findUnique({
      where: { id: body.businessRequestId },
    });

    if (!request) {
      throw new BadRequestException('Demande introuvable');
    }

    if (request.status === 'approved') {
      throw new BadRequestException('Cette demande est déjà approuvée');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: body.planId },
    });

    if (!plan) {
      throw new BadRequestException('Plan introuvable');
    }

    if (!plan.isActive) {
      throw new BadRequestException('Ce plan est inactif');
    }

    if (plan.sector !== request.sector) {
      throw new BadRequestException(
        'Le secteur du plan ne correspond pas à la demande',
      );
    }

    if (plan.billingCycle !== request.billingCycle) {
      throw new BadRequestException(
        "La fréquence du plan ne correspond pas à la demande",
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: request.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Un utilisateur existe déjà avec cet email',
      );
    }

    const rawPassword = body.managerPassword?.trim() || 'SunuSuite1234';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const startDate = new Date();
    const endDate = this.addPeriod(startDate, request.billingCycle);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: request.businessName.trim(),
          phone: request.phone.trim(),
          email: request.email.trim().toLowerCase(),
          isActive: true,
          sector: request.sector,
        },
      });

      const user = await tx.user.create({
        data: {
          email: request.email.trim().toLowerCase(),
          login: request.email.trim().toLowerCase(),
          password: hashedPassword,
          role: 'manager',
          tenantId: tenant.id,
          isActive: true,
          fullName: request.ownerName.trim(),
          phone: request.phone.trim(),
          canManageProperties: true,
          canManageTenants: true,
          canManageContracts: true,
          canManageRents: true,
          canManageOwnerPayments: true,
          canViewDashboard: true,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'active',
          startDate,
          endDate,
          autoRenew: Boolean(body.autoRenew),
        },
      });

      const module = await tx.tenantModule.create({
        data: {
          tenantId: tenant.id,
          sector: request.sector,
          isEnabled: true,
          activatedAt: startDate,
          expiresAt: endDate,
        },
      });

      await tx.businessRequest.update({
        where: { id: request.id },
        data: { status: 'approved' },
      });

      return {
        tenant,
        user,
        subscription,
        module,
        temporaryPassword: rawPassword,
      };
    });

    return result;
  }

  async rejectBusinessRequest(body: { businessRequestId: string }) {
    const request = await this.prisma.businessRequest.findUnique({
      where: { id: body.businessRequestId },
    });

    if (!request) {
      throw new BadRequestException('Demande introuvable');
    }

    return this.prisma.businessRequest.update({
      where: { id: request.id },
      data: { status: 'rejected' },
    });
  }

  async dashboard() {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      totalTenants,
      totalSubscriptions,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.businessRequest.count(),
      this.prisma.businessRequest.count({ where: { status: 'pending' } }),
      this.prisma.businessRequest.count({ where: { status: 'approved' } }),
      this.prisma.tenant.count(),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      totalTenants,
      totalSubscriptions,
      activeSubscriptions,
    };
  }
}
