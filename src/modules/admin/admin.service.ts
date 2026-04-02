import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { SubscriptionContractService } from '../contracts/subscription-contract.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly subscriptionContractService: SubscriptionContractService,
  ) {}

  private get prismaAny(): any {
    return this.prisma as any;
  }

  private getRequestDelegate(): any {
    return (
      this.prismaAny.subscriptionRequest ||
      this.prismaAny.businessRequest ||
      this.prismaAny.businessRequests ||
      null
    );
  }

  async dashboard() {
    const requestDelegate = this.getRequestDelegate();

    const [
      tenantsCount,
      subscriptionsCount,
      plansCount,
      usersCount,
      pendingRequestsCount,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.subscription.count(),
      this.prisma.plan.count(),
      this.prisma.user.count(),
      requestDelegate
        ? requestDelegate.count({
            where: { status: 'pending' },
          })
        : Promise.resolve(0),
    ]);

    return {
      tenantsCount,
      subscriptionsCount,
      plansCount,
      usersCount,
      pendingRequestsCount,
    };
  }

  async getRequests() {
    const requestDelegate = this.getRequestDelegate();

    if (!requestDelegate) {
      return [];
    }

    return requestDelegate.findMany({
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenants() {
    return this.prisma.tenant.findMany({
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        modules: true,
        users: true,
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
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async validateRequest(requestId: string) {
    const requestDelegate = this.getRequestDelegate();

    if (!requestDelegate) {
      throw new BadRequestException('Aucun modèle Prisma de demande trouvé.');
    }

    const request = await requestDelegate.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    if ((request as any).status === 'validated') {
      throw new BadRequestException('Cette demande est déjà validée');
    }

    const requestEmail =
      (request as any).email ||
      (request as any).ownerEmail ||
      (request as any).managerEmail ||
      null;

    if (!requestEmail) {
      throw new BadRequestException('Aucun email trouvé sur la demande');
    }

    const existingTenant = await this.prisma.tenant.findFirst({
      where: { email: requestEmail },
    });

    if (existingTenant) {
      throw new BadRequestException('Un tenant existe déjà avec cet email');
    }

    const planId = (request as any).planId;
    if (!planId) {
      throw new BadRequestException('Aucun planId trouvé sur la demande');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const hashedPassword = await bcrypt.hash('SunuSuite1234', 10);

    const companyName =
      (request as any).businessName ||
      (request as any).companyName ||
      (request as any).name ||
      'Tenant';

    const phone =
      (request as any).phone ||
      (request as any).ownerPhone ||
      (request as any).managerPhone ||
      null;

    const managerName =
      `${(request as any).firstName ?? ''} ${(request as any).lastName ?? ''}`.trim() ||
      (request as any).ownerName ||
      (request as any).managerName ||
      companyName;

    const sector = (request as any).sector || (plan as any).sector || 'commerce';

    const tenant = await this.prisma.tenant.create({
      data: {
        name: companyName,
        email: requestEmail,
        phone,
        sector,
        isActive: true,
      },
    });

    const adminUser = await this.prisma.user.create({
      data: {
        email: requestEmail,
        password: hashedPassword,
        tenantId: tenant.id,
        role: 'manager',
        fullName: managerName,
        phone,
        isActive: true,
        canManageProperties: true,
        canManageTenants: true,
        canManageContracts: true,
        canManageRents: true,
        canManageOwnerPayments: true,
        canViewDashboard: true,
      },
    });

    const startsAt = new Date();
    const endsAt = new Date(startsAt);

    if ((plan as any).billingCycle === 'yearly') {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setMonth(endsAt.getMonth() + 1);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'active',
        startDate: startsAt,
        endDate: endsAt,
        lastPaymentAt: startsAt,
      },
    });

    await this.prisma.tenantModule.create({
      data: {
        tenantId: tenant.id,
        sector,
        isEnabled: true,
      },
    });

    const pdfBuffer = await this.subscriptionContractService.generateSubscriptionContractPdf({
      companyName,
      managerName,
      email: requestEmail,
      phone: phone ?? '',
      planName: plan.name ?? 'Abonnement',
      amount: String((plan as any).price ?? ''),
      startDate: startsAt.toLocaleDateString('fr-FR'),
      endDate: endsAt.toLocaleDateString('fr-FR'),
      loginEmail: requestEmail,
      temporaryPassword: 'SunuSuite1234',
    });

    await this.mailService.sendManagerAccessEmail({
      to: requestEmail,
      ownerName: managerName,
      login: requestEmail,
      password: 'SunuSuite1234',
      pdfBuffer,
    });

    await requestDelegate.update({
      where: { id: requestId },
      data: {
        status: 'validated',
      },
    });

    return {
      message: 'Demande validée avec succès',
      tenant,
      adminUser,
      subscription,
    };
  }

  async rejectRequest(requestId: string) {
    const requestDelegate = this.getRequestDelegate();

    if (!requestDelegate) {
      throw new BadRequestException('Aucun modèle Prisma de demande trouvé.');
    }

    const request = await requestDelegate.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    await requestDelegate.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
      },
    });

    return {
      message: 'Demande rejetée avec succès',
    };
  }

  async updateTenant(
    tenantId: string,
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      sector?: string;
      isActive?: boolean;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Client introuvable');
    }

    if (payload.email && payload.email !== tenant.email) {
      const existingTenant = await this.prisma.tenant.findFirst({
        where: {
          email: payload.email,
          NOT: { id: tenantId },
        },
      });

      if (existingTenant) {
        throw new BadRequestException('Un autre client utilise déjà cet email');
      }
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.sector !== undefined ? { sector: payload.sector } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        users: true,
        modules: true,
      },
    });

    if (payload.email !== undefined || payload.phone !== undefined || payload.isActive !== undefined) {
      await this.prisma.user.updateMany({
        where: { tenantId },
        data: {
          ...(payload.email !== undefined ? { email: payload.email } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        },
      });
    }

    return {
      message: 'Client modifié avec succès',
      tenant: updatedTenant,
    };
  }

  async deleteTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: true,
        modules: true,
        users: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Client introuvable');
    }

    await this.prisma.$transaction(async (tx) => {
      const subscriptions = await tx.subscription.findMany({
        where: { tenantId },
        select: { id: true },
      });

      const subscriptionIds = subscriptions.map((s) => s.id);

      if (subscriptionIds.length > 0) {
        await tx.subscriptionPayment.deleteMany({
          where: {
            subscriptionId: {
              in: subscriptionIds,
            },
          },
        });
      }

      await tx.subscription.deleteMany({
        where: { tenantId },
      });

      await tx.tenantModule.deleteMany({
        where: { tenantId },
      });

      await tx.user.deleteMany({
        where: { tenantId },
      });

      await tx.tenant.delete({
        where: { id: tenantId },
      });
    });

    return {
      message: 'Client supprimé avec succès',
    };
  }

  async updateSubscription(
    subscriptionId: string,
    payload: {
      planId?: string;
      status?: 'pending' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
      startDate?: string | Date | null;
      endDate?: string | Date | null;
      autoRenew?: boolean;
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tenant: true,
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }

    if (payload.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: payload.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan introuvable');
      }
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(payload.planId !== undefined ? { planId: payload.planId } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.startDate !== undefined
          ? { startDate: payload.startDate ? new Date(payload.startDate) : null }
          : {}),
        ...(payload.endDate !== undefined
          ? { endDate: payload.endDate ? new Date(payload.endDate) : null }
          : {}),
        ...(payload.autoRenew !== undefined ? { autoRenew: payload.autoRenew } : {}),
        ...(payload.status === 'active' ? { suspendedAt: null } : {}),
      },
      include: {
        tenant: true,
        plan: true,
        payments: true,
      },
    });

    if (payload.status === 'active') {
      await this.prisma.tenant.update({
        where: { id: updatedSubscription.tenantId },
        data: { isActive: true },
      });

      await this.prisma.user.updateMany({
        where: { tenantId: updatedSubscription.tenantId },
        data: { isActive: true },
      });

      await this.prisma.tenantModule.updateMany({
        where: { tenantId: updatedSubscription.tenantId },
        data: {
          isEnabled: true,
          expiresAt: null,
        },
      });
    }

    if (payload.status === 'suspended') {
      await this.prisma.tenant.update({
        where: { id: updatedSubscription.tenantId },
        data: { isActive: false },
      });

      await this.prisma.user.updateMany({
        where: { tenantId: updatedSubscription.tenantId },
        data: { isActive: false },
      });

      await this.prisma.tenantModule.updateMany({
        where: { tenantId: updatedSubscription.tenantId },
        data: {
          isEnabled: false,
          expiresAt: new Date(),
        },
      });
    }

    return {
      message: 'Abonnement modifié avec succès',
      subscription: updatedSubscription,
    };
  }

  async deleteSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionPayment.deleteMany({
        where: { subscriptionId },
      });

      await tx.subscription.delete({
        where: { id: subscriptionId },
      });
    });

    return {
      message: 'Abonnement supprimé avec succès',
    };
  }

  async suspendTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant introuvable');
    }

    const now = new Date();

    await this.prisma.subscription.updateMany({
      where: {
        tenantId,
        status: {
          in: ['active', 'past_due'],
        },
      },
      data: {
        status: 'suspended',
        suspendedAt: now,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: false,
      },
    });

    await this.prisma.user.updateMany({
      where: { tenantId },
      data: {
        isActive: false,
      },
    });

    await this.prisma.tenantModule.updateMany({
      where: { tenantId },
      data: {
        isEnabled: false,
        expiresAt: now,
      },
    });

    return {
      message: 'Accès du client suspendu avec succès',
    };
  }

  async reactivateTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant introuvable');
    }

    const latestSubscription = tenant.subscriptions?.[0];

    if (!latestSubscription) {
      throw new BadRequestException('Aucun abonnement trouvé pour ce client');
    }

    const now = new Date();
    const newEndDate = new Date(now);

    if (latestSubscription.plan.billingCycle === 'yearly') {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    } else {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    }

    await this.prisma.subscription.update({
      where: { id: latestSubscription.id },
      data: {
        status: 'active',
        startDate: now,
        endDate: newEndDate,
        lastPaymentAt: now,
        suspendedAt: null,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: true,
      },
    });

    await this.prisma.user.updateMany({
      where: { tenantId },
      data: {
        isActive: true,
      },
    });

    await this.prisma.tenantModule.updateMany({
      where: { tenantId },
      data: {
        isEnabled: true,
        expiresAt: null,
      },
    });

    return {
      message: 'Accès du client réactivé avec succès',
    };
  }

  async markSubscriptionPastDue() {
    const now = new Date();

    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          lt: now,
        },
      },
    });

    for (const subscription of expiredSubscriptions) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'past_due',
        },
      });
    }

    return {
      message: `${expiredSubscriptions.length} abonnement(s) marqué(s) en retard`,
    };
  }

  async suspendExpiredTenantsAfterGracePeriod(graceDays = 7) {
    const now = new Date();

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'past_due',
        endDate: {
          not: null,
        },
      },
      include: {
        tenant: true,
      },
    });

    let suspendedCount = 0;

    for (const subscription of subscriptions) {
      if (!subscription.endDate) continue;

      const graceLimit = new Date(subscription.endDate);
      graceLimit.setDate(graceLimit.getDate() + graceDays);

      if (now > graceLimit) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'suspended',
            suspendedAt: now,
          },
        });

        await this.prisma.tenant.update({
          where: { id: subscription.tenantId },
          data: {
            isActive: false,
          },
        });

        await this.prisma.user.updateMany({
          where: { tenantId: subscription.tenantId },
          data: {
            isActive: false,
          },
        });

        await this.prisma.tenantModule.updateMany({
          where: { tenantId: subscription.tenantId },
          data: {
            isEnabled: false,
            expiresAt: now,
          },
        });

        suspendedCount += 1;
      }
    }

    return {
      message: `${suspendedCount} client(s) suspendu(s) après délai de grâce`,
    };
  }
}
