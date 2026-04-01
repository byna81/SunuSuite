import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!item) {
      throw new BadRequestException('Plan introuvable');
    }

    return item;
  }

  async create(body: {
    code: string;
    name: string;
    sector: 'immobilier' | 'transport' | 'commerce';
    billingCycle: 'monthly' | 'yearly';
    price: number;
    currency?: string;
  }) {
    if (!body.code?.trim()) {
      throw new BadRequestException('Le code est obligatoire');
    }

    if (!body.name?.trim()) {
      throw new BadRequestException('Le nom est obligatoire');
    }

    if (!body.sector) {
      throw new BadRequestException('Le secteur est obligatoire');
    }

    if (!body.billingCycle) {
      throw new BadRequestException("La période est obligatoire");
    }

    if (Number(body.price || 0) <= 0) {
      throw new BadRequestException('Le prix doit être supérieur à 0');
    }

    const existing = await this.prisma.plan.findUnique({
      where: { code: body.code.trim() },
    });

    if (existing) {
      throw new BadRequestException('Ce code plan existe déjà');
    }

    return this.prisma.plan.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        sector: body.sector,
        billingCycle: body.billingCycle,
        price: Number(body.price),
        currency: body.currency?.trim() || 'XOF',
        isActive: true,
      },
    });
  }

  async update(id: string, body: any) {
    const existing = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Plan introuvable');
    }

    return this.prisma.plan.update({
      where: { id },
      data: {
        code: typeof body.code === 'string' ? body.code.trim() : existing.code,
        name: typeof body.name === 'string' ? body.name.trim() : existing.name,
        sector: body.sector || existing.sector,
        billingCycle: body.billingCycle || existing.billingCycle,
        price:
          typeof body.price === 'number' ? Number(body.price) : existing.price,
        currency:
          typeof body.currency === 'string'
            ? body.currency.trim() || 'XOF'
            : existing.currency,
        isActive:
          typeof body.isActive === 'boolean'
            ? body.isActive
            : existing.isActive,
      },
    });
  }
}
