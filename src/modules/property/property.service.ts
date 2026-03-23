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

  createTenant(
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
    return this.prisma.tenantProperty.create({
      data: {
        propertyId: data.propertyId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        rent: data.rent ?? 0,
        startDate: new Date(data.startDate),
        status: data.status || 'actif',
      },
    });
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
    },
    orderBy: { createdAt: 'desc' },
  });
}
}
