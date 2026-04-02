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
            where: { status: 'PENDING' },
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
    const requestDelegate = this.getRequestDelegate();

    if (!requestDelegate) {
      throw new BadRequestException(
        'Aucun modèle Prisma de demande trouvé.',
      );
    }

    const request = await requestDelegate.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    if ((request as any).status === 'VALIDATED') {
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

    const tenant = await (this.prisma.tenant as any).create({
      data: {
        name: companyName,
        email: requestEmail,
        phone,
      },
    });

    const adminUser = await (this.prisma.user as any).create({
      data: {
        email: requestEmail,
        password: hashedPassword,
        tenantId: tenant.id,
        role: 'manager',
        fullName: managerName,
        phone,
      },
    });

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + 1);

    const subscription = await (this.prisma.subscription as any).create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: startsAt,
        endDate: endsAt,
      },
    });

    await (this.prisma.tenantModule as any).create({
      data: {
        tenantId: tenant.id,
        sector: 'commerce',
        isEnabled: true,
      },
    });

    const pdfBuffer =
      await this.subscriptionContractService.generateSubscriptionContractPdf({
        companyName,
        managerName,
        email: requestEmail,
        phone: phone ?? '',
        planName: (plan as any).name ?? 'Abonnement',
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
        status: 'VALIDATED',
        tenantId: tenant.id,
      },
    });

    return {
      message: 'Demande validée avec succès',
      tenant,
      adminUser,
      subscription,
    };
  }
}
