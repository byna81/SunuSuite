import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicle.findMany({
      where: { tenantId },
      include: {
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.vehicle.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        owner: true,
      },
    });

    if (!item) {
      throw new BadRequestException('Véhicule introuvable');
    }

    return item;
  }

  async create(
    tenantId: string,
    body: {
      brand: string;
      model: string;
      year: number;
      ownerId?: string | null;
      registrationNumber?: string;
      color?: string;
      fuelType?: string;
      transmission?: string;
      mileage?: number;
      usageType?: string;
      status?: string;
      price?: number;
      salePrice?: number;
      rentalPriceDay?: number;
      rentalPriceWeek?: number;
      rentalPriceMonth?: number;
      insuranceExpiry?: string;
      technicalVisitExpiry?: string;
      notes?: string;
    },
  ) {
    if (!body.brand?.trim()) {
      throw new BadRequestException('La marque est obligatoire');
    }

    if (!body.model?.trim()) {
      throw new BadRequestException('Le modèle est obligatoire');
    }

    if (!body.year || Number(body.year) <= 0) {
      throw new BadRequestException("L'année est obligatoire");
    }

    const registrationNumber = body.registrationNumber?.trim() || null;
    const ownerId = body.ownerId?.trim() || null;

    if (registrationNumber) {
      const existing = await this.prisma.vehicle.findFirst({
        where: {
          tenantId,
          registrationNumber,
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Cette immatriculation existe déjà pour ce client',
        );
      }
    }

    if (ownerId) {
      const owner = await this.prisma.owner.findFirst({
        where: {
          id: ownerId,
          tenantId,
        },
      });

      if (!owner) {
        throw new BadRequestException('Propriétaire introuvable');
      }
    }

    return this.prisma.vehicle.create({
      data: {
        tenantId,
        ownerId,
        brand: body.brand.trim(),
        model: body.model.trim(),
        year: Number(body.year),
        registrationNumber,
        color: body.color?.trim() || null,
        fuelType: body.fuelType?.trim() || null,
        transmission: body.transmission?.trim() || null,
        mileage: Number(body.mileage || 0),
        usageType: (body.usageType || 'sale') as any,
        status: (body.status || 'disponible') as any,
        price: Number(body.price || 0),
        salePrice: Number(body.salePrice || 0),
        rentalPriceDay: Number(body.rentalPriceDay || 0),
        rentalPriceWeek: Number(body.rentalPriceWeek || 0),
        rentalPriceMonth: Number(body.rentalPriceMonth || 0),
        insuranceExpiry: body.insuranceExpiry
          ? new Date(body.insuranceExpiry)
          : null,
        technicalVisitExpiry: body.technicalVisitExpiry
          ? new Date(body.technicalVisitExpiry)
          : null,
        notes: body.notes?.trim() || null,
      },
      include: {
        owner: true,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    body: {
      brand?: string;
      model?: string;
      year?: number;
      ownerId?: string | null;
      registrationNumber?: string;
      color?: string;
      fuelType?: string;
      transmission?: string;
      mileage?: number;
      usageType?: string;
      status?: string;
      price?: number;
      salePrice?: number;
      rentalPriceDay?: number;
      rentalPriceWeek?: number;
      rentalPriceMonth?: number;
      insuranceExpiry?: string | null;
      technicalVisitExpiry?: string | null;
      notes?: string;
    },
  ) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new BadRequestException('Véhicule introuvable');
    }

    const registrationNumber =
      typeof body.registrationNumber === 'string'
        ? body.registrationNumber.trim() || null
        : existing.registrationNumber;

    if (registrationNumber) {
      const duplicate = await this.prisma.vehicle.findFirst({
        where: {
          tenantId,
          registrationNumber,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'Cette immatriculation existe déjà pour ce client',
        );
      }
    }

    let nextOwnerId = existing.ownerId;

    if (body.ownerId !== undefined) {
      nextOwnerId = typeof body.ownerId === 'string'
        ? body.ownerId.trim() || null
        : null;

      if (nextOwnerId) {
        const owner = await this.prisma.owner.findFirst({
          where: {
            id: nextOwnerId,
            tenantId,
          },
        });

        if (!owner) {
          throw new BadRequestException('Propriétaire introuvable');
        }
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ownerId: nextOwnerId,
        brand: body.brand?.trim() ?? existing.brand,
        model: body.model?.trim() ?? existing.model,
        year:
          typeof body.year === 'number' ? Number(body.year) : existing.year,
        registrationNumber,
        color:
          typeof body.color === 'string'
            ? body.color.trim() || null
            : existing.color,
        fuelType:
          typeof body.fuelType === 'string'
            ? body.fuelType.trim() || null
            : existing.fuelType,
        transmission:
          typeof body.transmission === 'string'
            ? body.transmission.trim() || null
            : existing.transmission,
        mileage:
          typeof body.mileage === 'number'
            ? Number(body.mileage)
            : existing.mileage,
        usageType: (body.usageType || existing.usageType) as any,
        status: (body.status || existing.status) as any,
        price:
          typeof body.price === 'number' ? Number(body.price) : existing.price,
        salePrice:
          typeof body.salePrice === 'number'
            ? Number(body.salePrice)
            : existing.salePrice,
        rentalPriceDay:
          typeof body.rentalPriceDay === 'number'
            ? Number(body.rentalPriceDay)
            : existing.rentalPriceDay,
        rentalPriceWeek:
          typeof body.rentalPriceWeek === 'number'
            ? Number(body.rentalPriceWeek)
            : existing.rentalPriceWeek,
        rentalPriceMonth:
          typeof body.rentalPriceMonth === 'number'
            ? Number(body.rentalPriceMonth)
            : existing.rentalPriceMonth,
        insuranceExpiry:
          body.insuranceExpiry === null
            ? null
            : typeof body.insuranceExpiry === 'string'
            ? new Date(body.insuranceExpiry)
            : existing.insuranceExpiry,
        technicalVisitExpiry:
          body.technicalVisitExpiry === null
            ? null
            : typeof body.technicalVisitExpiry === 'string'
            ? new Date(body.technicalVisitExpiry)
            : existing.technicalVisitExpiry,
        notes:
          typeof body.notes === 'string'
            ? body.notes.trim() || null
            : existing.notes,
      },
      include: {
        owner: true,
      },
    });
  }
}
