import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenantId: string,
    body: {
      title: string;
      type: string;
      address: string;
      amount: string;
      status?: string;
      description?: string;
      ownershipType?: 'agency' | 'owner';
      ownerName?: string;
      ownerPhone?: string;
      ownerEmail?: string;
      ownerAddress?: string;
    },
  ) {
    const ownershipType = body.ownershipType || 'agency';

    let ownerId: string | null = null;

    if (ownershipType === 'owner') {
      if (!body.ownerName?.trim()) {
        throw new Error('Le nom du propriétaire est obligatoire');
      }

      const createdOwner = await this.prisma.owner.create({
        data: {
          tenantId,
          name: body.ownerName.trim(),
          phone: body.ownerPhone?.trim() || null,
          email: body.ownerEmail?.trim() || null,
          address: body.ownerAddress?.trim() || null,
        },
      });

      ownerId = createdOwner.id;
    }

    return this.prisma.property.create({
      data: {
        tenantId,
        ownerId,
        title: body.title.trim(),
        type: body.type.trim(),
        address: body.address.trim(),
        amount: body.amount.trim(),
        status: body.status || 'disponible',
        description: body.description?.trim() || null,
      },
      include: {
        owner: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId },
      include: {
        owner: true,
        tenants: {
          where: {
            status: 'actif',
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPropertiesForSelect(tenantId: string) {
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
        amount: true,
        status: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllTenants(tenantId: string) {
    return this.prisma.tenantProperty.findMany({
      where: {
        property: {
          tenantId,
        },
      },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createTenant(
    tenantId: string,
    body: {
      propertyId: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
      rent?: number;
      startDate: string;
    },
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: body.propertyId,
        tenantId,
      },
    });

    if (!property) {
      throw new Error('Bien introuvable');
    }

    if (property.status !== 'disponible') {
      throw new Error("Ce bien n'est pas disponible");
    }

    const tenant = await this.prisma.tenantProperty.create({
      data: {
        propertyId: body.propertyId,
        name: body.name.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        rent:
          body.rent && !Number.isNaN(Number(body.rent))
            ? Number(body.rent)
            : Number(String(property.amount).replace(/[^\d]/g, '')) || 0,
        startDate: new Date(body.startDate),
        status: 'actif',
      },
      include: {
        property: true,
      },
    });

    await this.prisma.property.update({
      where: { id: body.propertyId },
      data: {
        status: 'occupé',
      },
    });

    return tenant;
  }

  async checkoutTenant(tenantId: string, tenantPropertyId: string) {
    const tenantProperty = await this.prisma.tenantProperty.findFirst({
      where: {
        id: tenantPropertyId,
        property: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!tenantProperty) {
      throw new Error('Locataire introuvable');
    }

    if (tenantProperty.status !== 'actif') {
      throw new Error('Ce locataire a déjà quitté le logement');
    }

    const updatedTenant = await this.prisma.tenantProperty.update({
      where: {
        id: tenantPropertyId,
      },
      data: {
        status: 'quitté',
        endDate: new Date(),
      },
      include: {
        property: true,
      },
    });

    await this.prisma.property.update({
      where: {
        id: tenantProperty.propertyId,
      },
      data: {
        status: 'disponible',
      },
    });

    return updatedTenant;
  }
}
