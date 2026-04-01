import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  // 🔥 utilisé par le site vitrine
  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  // 🔥 utilisé par l’admin
  async findAllAdmin() {
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
    const code = body.code?.trim();
    const name = body.name?.trim();
    const currency = body.currency?.trim() || 'XOF';
    const price = Number(body.price);

    if (!code) {
      throw new BadRequestException('Le code est obligatoire');
    }

    if (!name) {
      throw new BadRequestException('Le nom est obligatoire');
    }

    if (!body.sector) {
      throw new BadRequestException('Le secteur est obligatoire');
    }

    if (!body.billingCycle) {
      throw new BadRequestException("La période est obligatoire");
    }

    if (!price || price <= 0) {
      throw new BadRequestException('Le prix doit être supérieur à 0');
    }

    const existing = await this.prisma.plan.findUnique({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException('Ce code plan existe déjà');
    }

    return this.prisma.plan.create({
      data: {
        code,
        name,
        sector: body.sector,
        billingCycle: body.billingCycle,
        price,
        currency,
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

    let code = existing.code;

    if (typeof body.code === 'string') {
      const newCode = body.code.trim();

      if (!newCode) {
        throw new BadRequestException('Le code ne peut pas être vide');
      }

      if (newCode !== existing.code) {
        const duplicate = await this.prisma.plan.findUnique({
          where: { code: newCode },
        });

        if (duplicate) {
          throw new BadRequestException('Ce code plan existe déjà');
        }
      }

      code = newCode;
    }

    return this.prisma.plan.update({
      where: { id },
      data: {
        code,
        name:
          typeof body.name === 'string'
            ? body.name.trim() || existing.name
            : existing.name,

        sector: body.sector || existing.sector,
        billingCycle: body.billingCycle || existing.billingCycle,

        price:
          typeof body.price === 'number'
            ? Number(body.price)
            : existing.price,

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
