import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.leaseContract.findMany({
      where: { tenantId },
      include: {
        property: true,
        tenantProperty: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const contract = await this.prisma.leaseContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });

    if (!contract) {
      throw new Error('Contrat introuvable');
    }

    return contract;
  }

  async getSelectData(tenantId: string) {
    const properties = await this.prisma.property.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        type: true,
        address: true,
        amount: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenants = await this.prisma.tenantProperty.findMany({
      where: {
        status: 'actif',
        property: {
          tenantId,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            type: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { properties, tenants };
  }

  async create(
    tenantId: string,
    data: {
      propertyId: string;
      tenantPropertyId: string;
      startDate: string;
      endDate?: string;
      rentAmount: number;
      depositAmount?: number;
      paymentFrequency?: string;
      status?: string;
      notes?: string;
      inventoryInNotes?: string;
      inventoryOutNotes?: string;
    },
  ) {
    const tenant = await this.prisma.tenantProperty.findFirst({
      where: {
        id: data.tenantPropertyId,
        status: 'actif',
        property: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!tenant) {
      throw new Error('Locataire actif introuvable');
    }

    if (tenant.propertyId !== data.propertyId) {
      throw new Error('Le locataire ne correspond pas à ce bien');
    }

    return this.prisma.leaseContract.create({
      data: {
        tenantId,
        propertyId: data.propertyId,
        tenantPropertyId: data.tenantPropertyId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount ?? 0,
        paymentFrequency: data.paymentFrequency || 'mensuel',
        status: data.status || 'brouillon',
        notes: data.notes || null,
        inventoryInNotes: data.inventoryInNotes || null,
        inventoryOutNotes: data.inventoryOutNotes || null,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      startDate?: string;
      endDate?: string;
      rentAmount?: number;
      depositAmount?: number;
      paymentFrequency?: string;
      notes?: string;
      inventoryInNotes?: string;
      inventoryOutNotes?: string;
      status?: string;
    },
  ) {
    const existing = await this.prisma.leaseContract.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Contrat introuvable');
    }

    return this.prisma.leaseContract.update({
      where: { id },
      data: {
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        paymentFrequency: data.paymentFrequency,
        notes: data.notes,
        inventoryInNotes: data.inventoryInNotes,
        inventoryOutNotes: data.inventoryOutNotes,
        status: data.status,
      },
    });
  }

  async activate(tenantId: string, id: string) {
    const existing = await this.prisma.leaseContract.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Contrat introuvable');
    }

    return this.prisma.leaseContract.update({
      where: { id },
      data: {
        status: 'actif',
        terminatedAt: null,
      },
    });
  }

  async terminate(tenantId: string, id: string) {
    const existing = await this.prisma.leaseContract.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Contrat introuvable');
    }

    return this.prisma.leaseContract.update({
      where: { id },
      data: {
        status: 'résilié',
        terminatedAt: new Date(),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.leaseContract.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Contrat introuvable');
    }

    await this.prisma.leaseContract.delete({
      where: { id },
    });

    return { message: 'Contrat supprimé' };
  }
}
