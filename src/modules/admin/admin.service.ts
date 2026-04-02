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

  async dashboard() {
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
      this.prisma.subscriptionRequest.count({
        where: { status: 'PENDING' as any },
      }),
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
    return this.prisma.subscriptionRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        tenant: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlans() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async validateRequest(requestId: string) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    if ((request as any).status === 'VALIDATED') {
      throw new BadRequestException('Cette demande est déjà validée');
    }

    const existingTenant = await this.prisma.tenant.findFirst({
      where: { email: (request as any).email },
    });

    if (existingTenant) {
      throw new BadRequestException('Un tenant existe déjà avec cet email');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: (request as any).planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    const hashedPassword = await bcrypt.hash('SunuSuite1234', 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: (request as any).companyName ?? (request as any).name ?? 'Tenant',
        email: (request as any).email,
        phone: (request as any).phone ?? null,
        status: 'ACTIVE' as any,
      },
    });

    const adminUser = await this.prisma.user.create({
      data: {
        firstName: (request as any).firstName ?? 'Manager',
        lastName: (request as any).lastName ?? '',
        email: (request as any).email,
        password: hashedPassword,
        role: 'manager' as any,
        tenantId: tenant.id,
      },
    });

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + 1);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'ACTIVE' as any,
        startedAt: startsAt,
        endsAt,
      },
    });

    const modulesToEnable = ['commerce'];

    for (const moduleName of modulesToEnable) {
      await this.prisma.tenantModule.create({
        data: {
          tenantId: tenant.id,
          sector: moduleName as any,
          isEnabled: true,
        },
      });
    }

    const pdfBuffer = await this.subscriptionContractService.generateSubscriptionContractPdf({
      companyName: (request as any).companyName ?? (request as any).name ?? 'Tenant',
      managerName: `${(request as any).firstName ?? ''} ${(request as any).lastName ?? ''}`.trim(),
      email: (request as any).email,
      phone: (request as any).phone ?? '',
      planName: (plan as any).name ?? 'Abonnement',
      amount: String((plan as any).price ?? ''),
      startDate: startsAt.toLocaleDateString('fr-FR'),
      endDate: endsAt.toLocaleDateString('fr-FR'),
      loginEmail: (request as any).email,
      temporaryPassword: 'SunuSuite1234',
    });

    await this.mailService.sendSubscriptionValidationEmail({
      to: (request as any).email,
      companyName: (request as any).companyName ?? (request as any).name ?? 'Tenant',
      loginEmail: (request as any).email,
      temporaryPassword: 'SunuSuite1234',
      pdfBuffer,
      pdfFilename: `contrat-abonnement-${tenant.id}.pdf`,
    });

    await this.prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: {
        status: 'VALIDATED' as any,
        tenantId: tenant.id,
      } as any,
    });

    return {
      message: 'Demande validée avec succès',
      tenant,
      adminUser,
      subscription,
    };
  }
}
