import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicle.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: any) {
    return this.prisma.vehicle.create({
      data: {
        tenantId,
        brand: data.brand,
        model: data.model,
        year: data.year,
        registrationNumber: data.registrationNumber,
        color: data.color,
        fuelType: data.fuelType,
        transmission: data.transmission,
        mileage: data.mileage || 0,
        usageType: data.usageType,
        status: data.status,
        price: data.price || 0,
        salePrice: data.salePrice || 0,
        rentalPriceDay: data.rentalPriceDay || 0,
        rentalPriceWeek: data.rentalPriceWeek || 0,
        rentalPriceMonth: data.rentalPriceMonth || 0,
        insuranceExpiry: data.insuranceExpiry
          ? new Date(data.insuranceExpiry)
          : null,
        technicalVisitExpiry: data.technicalVisitExpiry
          ? new Date(data.technicalVisitExpiry)
          : null,
        notes: data.notes,
      },
    });
  }
}
