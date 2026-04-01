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

  async getRequests() {
    return this.prisma.businessRequest.findMany({
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenants() {
    return this.prisma.tenant.findMany({
      include: {
        users: true,
        subscriptions: {
          include: {
            plan: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        modules: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        tenant: true,
        plan: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlans() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveBusinessRequest(body: {
    businessRequestId: string;
    planId?: string;
    managerPassword?: string;
    autoRenew?: boolean;
  }) {
    if (!body.businessRequestId) {
      throw new BadRequestException('La demande est obligatoire');
    }

    const request = await this.prisma.businessRequest.findUnique({
      where: { id: body.businessRequestId },
      include: { plan: true },
    });

    if (!request) {
      throw new BadRequestException('Demande introuvable');
    }

    if (request.status === 'approved') {
      throw new BadRequestException('Cette demande est déjà approuvée');
    }

    if (request.status === 'rejected') {
      throw new BadRequestException('Cette demande a déjà été rejetée');
    }

    if (
      request.paymentStatus !== 'received' &&
      request.paymentStatus !== 'validated'
    ) {
      throw new BadRequestException(
        'Le paiement doit être confirmé avant approbation',
      );
    }

    const planId = body.planId || request.planId;

    if (!planId) {
      throw new BadRequestException('Le plan est obligatoire');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Plan introuvable');
    }

    if (!plan.isActive) {
      throw new BadRequestException('Ce plan est inactif');
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
    const endDate = this.addPeriod(startDate, plan.billingCycle);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: request.businessName.trim(),
          phone: request.phone.trim(),
          email: request.email.trim().toLowerCase(),
          isActive: true,
          sector: plan.sector,
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
        include: {
          plan: true,
          payments: true,
        },
      });

      const module = await tx.tenantModule.create({
        data: {
          tenantId: tenant.id,
          sector: plan.sector,
          isEnabled: true,
          activatedAt: startDate,
          expiresAt: endDate,
        },
      });

      await tx.businessRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          paymentStatus: 'validated',
        },
      });

      if (
        typeof request.paidAmount === 'number' &&
        request.paidAmount > 0
      ) {
        await tx.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount: Number(request.paidAmount),
            currency: plan.currency || 'XOF',
            paymentMethod: request.paymentMethod || 'manual',
            status: 'paid',
            transactionRef: request.paymentReference || null,
            paidAt: request.paidAt || new Date(),
          },
        });
      }

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
    if (!body.businessRequestId) {
      throw new BadRequestException('La demande est obligatoire');
    }

    const request = await this.prisma.businessRequest.findUnique({
      where: { id: body.businessRequestId },
    });

    if (!request) {
      throw new BadRequestException('Demande introuvable');
    }

    if (request.status === 'approved') {
      throw new BadRequestException(
        'Impossible de rejeter une demande déjà approuvée',
      );
    }

    if (request.status === 'rejected') {
      throw new BadRequestException('Cette demande est déjà rejetée');
    }

    return this.prisma.businessRequest.update({
      where: { id: request.id },
      data: {
        status: 'rejected',
        paymentStatus:
          request.paymentStatus === 'validated'
            ? request.paymentStatus
            : 'rejected',
      },
    });
  }

  async dashboard() {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalTenants,
      activeTenants,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      totalPlans,
      activePlans,
      pendingPayments,
      receivedPayments,
      validatedPayments,
    ] = await Promise.all([
      this.prisma.businessRequest.count(),
      this.prisma.businessRequest.count({ where: { status: 'pending' } }),
      this.prisma.businessRequest.count({ where: { status: 'approved' } }),
      this.prisma.businessRequest.count({ where: { status: 'rejected' } }),
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.subscription.count({ where: { status: 'expired' } }),
      this.prisma.plan.count(),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.businessRequest.count({
        where: { paymentStatus: 'pending' },
      }),
      this.prisma.businessRequest.count({
        where: { paymentStatus: 'received' },
      }),
      this.prisma.businessRequest.count({
        where: { paymentStatus: 'validated' },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalTenants,
      activeTenants,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      totalPlans,
      activePlans,
      pendingPayments,
      receivedPayments,
      validatedPayments,
    };
  }
}
