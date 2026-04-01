import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessRequestsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.businessRequest.findMany({
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.businessRequest.findUnique({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!item) {
      throw new BadRequestException('Demande introuvable');
    }

    return item;
  }

  async create(body: {
    businessName: string;
    ownerName: string;
    phone: string;
    email: string;
    notes?: string;
    planId?: string;
    paymentMethod?: string;
    paymentReference?: string;
    paymentPhoneSentTo?: string;
    paymentProofUrl?: string;
    paidAmount?: number;
  }) {
    const businessName = body.businessName?.trim();
    const ownerName = body.ownerName?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim().toLowerCase();
    const notes = body.notes?.trim() || null;
    const paymentMethod = body.paymentMethod?.trim() || null;
    const paymentReference = body.paymentReference?.trim() || null;
    const paymentPhoneSentTo = body.paymentPhoneSentTo?.trim() || null;
    const paymentProofUrl = body.paymentProofUrl?.trim() || null;
    const paidAmount =
      typeof body.paidAmount === 'number' ? Number(body.paidAmount) : null;

    if (!businessName) {
      throw new BadRequestException("Le nom de l'activité est obligatoire");
    }

    if (!ownerName) {
      throw new BadRequestException('Le nom du responsable est obligatoire');
    }

    if (!phone) {
      throw new BadRequestException('Le téléphone est obligatoire');
    }

    if (!email) {
      throw new BadRequestException("L'email est obligatoire");
    }

    if (!body.planId) {
      throw new BadRequestException('Le plan est obligatoire');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: body.planId },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Plan introuvable ou inactif');
    }

    const existingPendingRequest = await this.prisma.businessRequest.findFirst({
      where: {
        email,
        businessName,
        planId: body.planId,
        status: 'pending',
      },
    });

    if (existingPendingRequest) {
      throw new BadRequestException(
        'Une demande similaire est déjà en attente de validation',
      );
    }

    return this.prisma.businessRequest.create({
      data: {
        businessName,
        ownerName,
        phone,
        email,
        sector: plan.sector,
        billingCycle: plan.billingCycle,
        notes,
        status: 'pending',
        planId: plan.id,
        expectedAmount: plan.price,
        paymentMethod,
        paymentReference,
        paymentPhoneSentTo,
        paymentProofUrl,
        paidAmount,
        paymentStatus: 'pending',
      },
      include: {
        plan: true,
      },
    });
  }

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    const existing = await this.prisma.businessRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Demande introuvable');
    }

    const allowedStatuses = ['pending', 'approved', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Statut invalide');
    }

    return this.prisma.businessRequest.update({
      where: { id },
      data: { status },
    });
  }

  async updatePaymentStatus(
    id: string,
    body: {
      paymentStatus: 'pending' | 'received' | 'validated' | 'rejected';
      paidAmount?: number;
      paymentReference?: string;
      paymentMethod?: string;
      paymentPhoneSentTo?: string;
    },
  ) {
    const existing = await this.prisma.businessRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Demande introuvable');
    }

    const allowedStatuses = ['pending', 'received', 'validated', 'rejected'];

    if (!allowedStatuses.includes(body.paymentStatus)) {
      throw new BadRequestException('Statut de paiement invalide');
    }

    return this.prisma.businessRequest.update({
      where: { id },
      data: {
        paymentStatus: body.paymentStatus,
        paidAmount:
          typeof body.paidAmount === 'number'
            ? Number(body.paidAmount)
            : existing.paidAmount,
        paymentReference:
          typeof body.paymentReference === 'string'
            ? body.paymentReference.trim() || null
            : existing.paymentReference,
        paymentMethod:
          typeof body.paymentMethod === 'string'
            ? body.paymentMethod.trim() || null
            : existing.paymentMethod,
        paymentPhoneSentTo:
          typeof body.paymentPhoneSentTo === 'string'
            ? body.paymentPhoneSentTo.trim() || null
            : existing.paymentPhoneSentTo,
        paidAt:
          body.paymentStatus === 'received' || body.paymentStatus === 'validated'
            ? new Date()
            : existing.paidAt,
      },
      include: {
        plan: true,
      },
    });
  }
}
