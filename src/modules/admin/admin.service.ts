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
        ? requestDelegate.count({ where: { status: 'pending' } })
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

    if (!requestDelegate) return [];

    return requestDelegate.findMany({
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenants() {
    return this.prisma.tenant.findMany({
      include: {
        subscriptions: {
          include: { plan: true },
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

  // 🔥 CREATE SUBSCRIPTION (bouton admin)
  async createSubscription(payload: {
    tenantId: string;
    planId: string;
  }) {
    const { tenantId, planId } = payload;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Client introuvable');

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new NotFoundException('Plan introuvable');

    const existing = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'past_due', 'suspended'] },
      },
    });

    if (existing) {
      throw new BadRequestException('Client déjà abonné');
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
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: true },
    });

    return {
      message: 'Abonnement créé',
      subscription,
    };
  }

  // 🔥 VALIDATION ADMIN (le cœur de ton flow)
  async validateRequest(requestId: string) {
    const requestDelegate = this.getRequestDelegate();

    if (!requestDelegate) {
      throw new BadRequestException('Aucun modèle de demande');
    }

    const request = await requestDelegate.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Demande introuvable');

    const email =
      request.email ||
      request.ownerEmail ||
      request.managerEmail;

    const plan = await this.prisma.plan.findUnique({
      where: { id: request.planId },
    });

    if (!plan) throw new NotFoundException('Plan introuvable');

    const hashedPassword = await bcrypt.hash('SunuSuite1234', 10);

    // transaction = sécurité
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: request.businessName || 'Client',
          email,
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          tenantId: tenant.id,
          role: 'manager',
          isActive: true,
        },
      });

      const start = new Date();
      const end = new Date(start);

      if (plan.billingCycle === 'yearly') {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }

      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'active',
          startDate: start,
          endDate: end,
        },
      });

      await requestDelegate.update({
        where: { id: requestId },
        data: { status: 'validated' },
      });

      return { tenant, user, subscription, start, end };
    });

    // ⚠️ mail sécurisé (ne casse pas tout)
    try {
      const pdf = await this.subscriptionContractService.generateSubscriptionContractPdf({
        companyName: result.tenant.name,
        managerName: result.user.email,
        email: result.user.email,
        phone: '',
        planName: plan.name,
        amount: String(plan.price),
        startDate: result.start.toLocaleDateString(),
        endDate: result.end.toLocaleDateString(),
        loginEmail: result.user.email,
        temporaryPassword: 'SunuSuite1234',
      });

      await this.mailService.sendManagerAccessEmail({
        to: result.user.email,
        ownerName: result.user.email,
        login: result.user.email,
        password: 'SunuSuite1234',
        pdfBuffer: pdf,
      });
    } catch (e) {
      console.error('Mail error:', e);
    }

    return {
      message: 'Demande validée',
      ...result,
    };
  }

  async rejectRequest(id: string) {
    const requestDelegate = this.getRequestDelegate();

    await requestDelegate.update({
      where: { id },
      data: { status: 'rejected' },
    });

    return { message: 'Rejeté' };
  }

  async suspendTenant(id: string) {
    await this.prisma.tenant.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Suspendu' };
  }

  async reactivateTenant(id: string) {
    await this.prisma.tenant.update({
      where: { id },
      data: { isActive: true },
    });

    return { message: 'Réactivé' };
  }
}
