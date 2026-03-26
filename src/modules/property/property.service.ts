import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      ownerType?: 'agency' | 'owner';
      ownerName?: string;
      ownerPhone?: string;
      ownerEmail?: string;
      ownerAddress?: string;
    },
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!body.title?.trim()) {
      throw new BadRequestException('Le titre du bien est obligatoire');
    }

    if (!body.type?.trim()) {
      throw new BadRequestException('Le type du bien est obligatoire');
    }

    if (!body.address?.trim()) {
      throw new BadRequestException("L'adresse du bien est obligatoire");
    }

    if (!body.amount?.trim()) {
      throw new BadRequestException('Le montant du bien est obligatoire');
    }

    let ownerId: string | null = null;
    const ownerType = body.ownerType || 'agency';

    if (ownerType === 'owner') {
      if (!body.ownerName?.trim()) {
        throw new BadRequestException('Le nom du propriétaire est obligatoire');
      }

      const owner = await this.prisma.owner.create({
        data: {
          tenantId,
          name: body.ownerName.trim(),
          phone: body.ownerPhone?.trim() || null,
          email: body.ownerEmail?.trim() || null,
          address: body.ownerAddress?.trim() || null,
        },
      });

      ownerId = owner.id;
    }

    return this.prisma.property.create({
      data: {
        tenantId,
        ownerId,
        title: body.title.trim(),
        type: body.type.trim(),
        address: body.address.trim(),
        amount: body.amount.trim(),
        status: body.status?.trim() || 'disponible',
        description: body.description?.trim() || null,
      },
      include: {
        owner: true,
      },
    });
  }

  async findAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

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
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!id) {
      throw new BadRequestException('Identifiant du bien manquant');
    }

    const item = await this.prisma.property.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        owner: true,
        tenants: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        contracts: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        ownerPayments: {
          orderBy: {
            paidAt: 'desc',
          },
          include: {
            owner: true,
          },
        },
        rentPayments: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            tenantProperty: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Bien introuvable');
    }

    const activeTenant =
      item.tenants.find((tenant) => tenant.status === 'actif') || null;

    return {
      ...item,
      activeTenant,
    };
  }

  async findPropertiesForSelect(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    return this.prisma.property.findMany({
      where: { tenantId },
      include: {
        owner: true,
      },
      orderBy: {
        title: 'asc',
      },
    });
  }

  async findAllTenants(tenantId: string) {
    if (!tenantId) {
      return [];
    }

    try {
      const items = await this.prisma.tenantProperty.findMany({
        where: {
          property: {
            tenantId,
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          rent: true,
          startDate: true,
          endDate: true,
          status: true,
          property: {
            select: {
              id: true,
              title: true,
              type: true,
              address: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return items || [];
    } catch (e) {
      console.error('TENANTS ERROR:', e);
      return [];
    }
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
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!body.propertyId) {
      throw new BadRequestException('Le bien est obligatoire');
    }

    if (!body.name?.trim()) {
      throw new BadRequestException('Le nom du locataire est obligatoire');
    }

    if (!body.phone?.trim()) {
      throw new BadRequestException('Le téléphone du locataire est obligatoire');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: body.propertyId,
        tenantId,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable');
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();

    return this.prisma.tenantProperty.create({
      data: {
        propertyId: body.propertyId,
        name: body.name.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        rent: Number(body.rent || 0),
        startDate,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status?.trim() || 'actif',
      },
      include: {
        property: true,
      },
    });
  }

  async checkoutTenant(tenantId: string, id: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!id) {
      throw new BadRequestException('Identifiant du locataire manquant');
    }

    const tenantProperty = await this.prisma.tenantProperty.findFirst({
      where: {
        id,
        property: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!tenantProperty) {
      throw new NotFoundException('Locataire introuvable');
    }

    return this.prisma.tenantProperty.update({
      where: {
        id,
      },
      data: {
        status: 'quitté',
        endDate: new Date(),
      },
      include: {
        property: true,
      },
    });
  }

  async createOwnerPayment(
    tenantId: string,
    body: {
      propertyId: string;
      ownerId: string;
      amount: number;
      paymentMethod: string;
      otherMethod?: string;
      reference?: string;
      note?: string;
      periodLabel?: string;
      paidBy?: string;
      paidAt?: string;
    },
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!body.propertyId) {
      throw new BadRequestException('Le bien est obligatoire');
    }

    if (!body.ownerId) {
      throw new BadRequestException('Le propriétaire est obligatoire');
    }

    const amount = Number(body.amount || 0);

    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    if (!body.paymentMethod?.trim()) {
      throw new BadRequestException('Le moyen de paiement est obligatoire');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: body.propertyId,
        tenantId,
      },
      include: {
        owner: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable');
    }

    const owner = await this.prisma.owner.findFirst({
      where: {
        id: body.ownerId,
        tenantId,
      },
    });

    if (!owner) {
      throw new NotFoundException('Propriétaire introuvable');
    }

    if (property.ownerId && property.ownerId !== owner.id) {
      throw new BadRequestException(
        "Ce propriétaire n'est pas rattaché à ce bien",
      );
    }

    return this.prisma.ownerPayment.create({
      data: {
        tenantId,
        propertyId: body.propertyId,
        ownerId: body.ownerId,
        amount,
        paymentMethod: body.paymentMethod.trim(),
        otherMethod: body.otherMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        periodLabel: body.periodLabel?.trim() || null,
        paidBy: body.paidBy?.trim() || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      },
      include: {
        owner: true,
        property: true,
        tenant: true,
      },
    });
  }

  async findPropertyOwnerPayments(tenantId: string, propertyId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!propertyId) {
      throw new BadRequestException('Identifiant du bien manquant');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        tenantId,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable');
    }

    return this.prisma.ownerPayment.findMany({
      where: {
        tenantId,
        propertyId,
      },
      include: {
        owner: true,
        property: true,
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
