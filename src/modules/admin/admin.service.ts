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
          in: ['ACTIVE', 'PAST_DUE'],
        },
      },
      data: {
        status: 'SUSPENDED',
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
        status: 'ACTIVE',
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
        status: 'ACTIVE',
        endDate: {
          lt: now,
        },
      },
    });

    for (const subscription of expiredSubscriptions) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'PAST_DUE',
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
        status: 'PAST_DUE',
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
            status: 'SUSPENDED',
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

        suspendedCount += 1;
      }
    }

    return {
      message: `${suspendedCount} client(s) suspendu(s) après délai de grâce`,
    };
  }
}
