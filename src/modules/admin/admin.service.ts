import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SubscriptionContractService } from '../contracts/subscription-contract.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private contractService: SubscriptionContractService,
  ) {}

  // 🔎 Voir toutes les demandes
  async getBusinessRequests() {
    return this.prisma.businessRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔎 Voir une demande
  async getBusinessRequest(id: string) {
    const request = await this.prisma.businessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    return request;
  }

  // ❌ Rejeter une demande
  async rejectBusinessRequest(id: string) {
    const request = await this.prisma.businessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    return this.prisma.businessRequest.update({
      where: { id },
      data: {
        status: 'rejected',
      },
    });
  }

  // ✅ Approuver demande + créer compte + envoyer email + PDF
  async approveBusinessRequest(id: string) {
    const request = await this.prisma.businessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    if (request.status === 'approved') {
      throw new BadRequestException('Déjà approuvée');
    }

    // 🔎 Récupérer le plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: request.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan introuvable');
    }

    // 🔐 Générer mot de passe temporaire sécurisé
    const rawPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 🏢 Création tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: request.businessName,
        sector: request.sector,
      },
    });

    // 👤 Création manager
    const user = await this.prisma.user.create({
      data: {
        email: request.email,
        password: hashedPassword,
        role: 'manager',
        tenantId: tenant.id,
      },
    });

    // 📅 Dates abonnement
    const startDate = new Date();
    const endDate = new Date();

    if (request.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // 💳 Création abonnement
    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'active',
        startDate,
        endDate,
      },
    });

    // 🔓 Activation module
    await this.prisma.tenantModule.create({
      data: {
        tenantId: tenant.id,
        module: request.sector,
        isActive: true,
      },
    });

    // 📄 Génération PDF contrat
    const pdfBuffer = await this.contractService.generateContract({
      businessName: request.businessName,
      ownerName: request.ownerName,
      email: request.email,
      phone: request.phone,
      planName: plan.name,
      sector: request.sector,
      billingCycle: request.billingCycle,
      amount: request.expectedAmount || plan.price,
      startDate,
      paymentMethod: request.paymentMethod,
      paymentReference: request.paymentReference,
    });

    // 📧 Envoi email
    await this.mailService.sendManagerAccessEmail({
      to: request.email,
      ownerName: request.ownerName,
      login: request.email,
      password: rawPassword,
      pdfBuffer,
    });

    // ✅ Mise à jour demande
    await this.prisma.businessRequest.update({
      where: { id },
      data: {
        status: 'approved',
      },
    });

    return {
      message: 'Demande approuvée avec succès',
      login: request.email,
      password: rawPassword, // utile pour affichage admin
    };
  }
}
