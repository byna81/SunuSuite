import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RentService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.rentPayment.findMany({
      where: { tenantId },
      include: {
        property: true,
        tenantProperty: true,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.rentPayment.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });

    if (!item) {
      throw new Error('Loyer introuvable');
    }

    return item;
  }

  async findActiveTenantsForRent(tenantId: string) {
    return this.prisma.tenantProperty.findMany({
      where: {
        status: 'actif',
        property: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    tenantId: string,
    body: {
      propertyId: string;
      tenantPropertyId: string;
      month: number;
      year: number;
      amountDue?: number;
      dueDate?: string;
      note?: string;
    },
  ) {
    const tenantProperty = await this.prisma.tenantProperty.findFirst({
      where: {
        id: body.tenantPropertyId,
        status: 'actif',
        property: {
          id: body.propertyId,
          tenantId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!tenantProperty) {
      throw new Error('Locataire actif introuvable pour ce bien');
    }

    const month = Number(body.month);
    const year = Number(body.year);

    if (!month || month < 1 || month > 12) {
      throw new Error('Mois invalide');
    }

    if (!year || year < 2000) {
      throw new Error('Année invalide');
    }

    const existing = await this.prisma.rentPayment.findFirst({
      where: {
        propertyId: body.propertyId,
        tenantPropertyId: body.tenantPropertyId,
        month,
        year,
      },
    });

    if (existing) {
      throw new Error('Un loyer existe déjà pour cette période');
    }

    const amountDue =
      body.amountDue && Number(body.amountDue) > 0
        ? Number(body.amountDue)
        : Number(tenantProperty.rent || 0);

    return this.prisma.rentPayment.create({
      data: {
        tenantId,
        propertyId: body.propertyId,
        tenantPropertyId: body.tenantPropertyId,
        month,
        year,
        amountDue,
        amountPaid: 0,
        remainingAmount: amountDue,
        status: 'a_payer',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        note: body.note?.trim() || null,
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }

  async pay(
    tenantId: string,
    id: string,
    body: {
      amountPaid: number;
      paymentMethod?: string;
      paymentReference?: string;
      paymentDate?: string;
      note?: string;
    },
  ) {
    const item = await this.prisma.rentPayment.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      throw new Error('Loyer introuvable');
    }

    const incoming = Number(body.amountPaid || 0);

    if (incoming <= 0) {
      throw new Error('Le montant payé doit être supérieur à 0');
    }

    const newAmountPaid = Number(item.amountPaid) + incoming;
    const remainingAmount = Math.max(Number(item.amountDue) - newAmountPaid, 0);

    let status: 'a_payer' | 'partiel' | 'paye' | 'en_retard' = 'a_payer';

    if (newAmountPaid <= 0) {
      status = 'a_payer';
    } else if (remainingAmount > 0) {
      status = 'partiel';
    } else {
      status = 'paye';
    }

    return this.prisma.rentPayment.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        remainingAmount,
        status,
        paymentMethod: body.paymentMethod?.trim() || item.paymentMethod || null,
        paymentReference:
          body.paymentReference?.trim() || item.paymentReference || null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        note: body.note?.trim() || item.note || null,
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }

  async markLate(tenantId: string, id: string) {
    const item = await this.prisma.rentPayment.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      throw new Error('Loyer introuvable');
    }

    if (item.status === 'paye') {
      return item;
    }

    return this.prisma.rentPayment.update({
      where: { id },
      data: {
        status: 'en_retard',
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }
}
