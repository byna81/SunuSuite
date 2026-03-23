import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  create(
    tenantId: string,
    data: {
      title: string;
      type: string;
      address: string;
      amount: string;
      status?: string;
      description?: string;
    },
  ) {
    return this.prisma.property.create({
      data: {
        tenantId,
        title: data.title,
        type: data.type,
        address: data.address,
        amount: data.amount,
        status: data.status || 'disponible',
        description: data.description || null,
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPropertiesForSelect(tenantId: string) {
    return this.prisma.property.findMany({
      where: {
        tenantId,
        status: 'disponible',
      },
      select: {
        id: true,
        title: true,
        type: true,
        address: true,
        status: true,
        amount: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenant(
    tenantId: string,
    data: {
      propertyId: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
      rent?: number;
      startDate: string;
      status?: string;
    },
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: data.propertyId,
        tenantId,
      },
    });

    if (!property) {
      throw new Error('Bien introuvable');
    }

    if (property.status !== 'disponible') {
      throw new Error('Ce bien n’est pas disponible');
    }

    const tenantProperty = await this.prisma.tenantProperty.create({
      data: {
        propertyId: data.propertyId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        rent: data.rent ?? 0,
        startDate: new Date(data.startDate),
        endDate: null,
        status: data.status || 'actif',
      },
    });

    await this.prisma.property.update({
      where: { id: data.propertyId },
      data: {
        status: 'occupé',
      },
    });

    return tenantProperty;
  }

  findAllTenants(tenantId: string) {
    return this.prisma.tenantProperty.findMany({
      where: {
        property: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkoutTenant(tenantId: string, tenantPropertyId: string) {
    const tenant = await this.prisma.tenantProperty.findFirst({
      where: {
        id: tenantPropertyId,
        property: { tenantId },
      },
      include: {
        property: true,
      },
    });

    if (!tenant) {
      throw new Error('Locataire introuvable');
    }

    if (tenant.status === 'quitté') {
      throw new Error('Ce locataire est déjà clôturé');
    }

    await this.prisma.tenantProperty.update({
      where: { id: tenantPropertyId },
      data: {
        status: 'quitté',
        endDate: new Date(),
      },
    });

    await this.prisma.property.update({
      where: { id: tenant.propertyId },
      data: {
        status: 'disponible',
      },
    });

    return {
      message: 'Locataire clôturé et bien libéré',
    };
  }
}
