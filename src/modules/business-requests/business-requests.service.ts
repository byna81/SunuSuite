import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessRequestsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.businessRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.businessRequest.findUnique({
      where: { id },
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
    sector: 'immobilier' | 'transport' | 'commerce';
    billingCycle: 'monthly' | 'yearly';
    notes?: string;
  }) {
    if (!body.businessName?.trim()) {
      throw new BadRequestException("Le nom de l'activité est obligatoire");
    }

    if (!body.ownerName?.trim()) {
      throw new BadRequestException('Le nom du responsable est obligatoire');
    }

    if (!body.phone?.trim()) {
      throw new BadRequestException('Le téléphone est obligatoire');
    }

    if (!body.email?.trim()) {
      throw new BadRequestException("L'email est obligatoire");
    }

    if (!body.sector) {
      throw new BadRequestException('Le secteur est obligatoire');
    }

    if (!body.billingCycle) {
      throw new BadRequestException("Le type d'abonnement est obligatoire");
    }

    return this.prisma.businessRequest.create({
      data: {
        businessName: body.businessName.trim(),
        ownerName: body.ownerName.trim(),
        phone: body.phone.trim(),
        email: body.email.trim().toLowerCase(),
        sector: body.sector,
        billingCycle: body.billingCycle,
        notes: body.notes?.trim() || null,
        status: 'pending',
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

    return this.prisma.businessRequest.update({
      where: { id },
      data: { status },
    });
  }
}
