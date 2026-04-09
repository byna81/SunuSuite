import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VtcContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.vtcContract.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        vehicle: true,
        driver: true,
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const contract = await this.prisma.vtcContract.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        vehicle: true,
        driver: true,
        owner: true,
        driverPayments: true,
        ownerSettlements: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
    }

    return contract;
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.vehicleId?.trim()) {
      throw new BadRequestException('vehicleId obligatoire');
    }

    if (!body?.driverId?.trim()) {
      throw new BadRequestException('driverId obligatoire');
    }

    if (!body?.contractType) {
      throw new BadRequestException('contractType obligatoire');
    }

    if (!body?.startDate) {
      throw new BadRequestException('startDate obligatoire');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: body.vehicleId.trim(),
        tenantId: tenantId.trim(),
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Véhicule introuvable');
    }

    const driver = await this.prisma.vtcDriver.findFirst({
      where: {
        id: body.driverId.trim(),
        tenantId: tenantId.trim(),
      },
    });

    if (!driver) {
      throw new NotFoundException('Chauffeur introuvable');
    }

    if (body.ownerId?.trim()) {
      const owner = await this.prisma.owner.findFirst({
        where: {
          id: body.ownerId.trim(),
          tenantId: tenantId.trim(),
        },
      });

      if (!owner) {
        throw new NotFoundException('Propriétaire introuvable');
      }
    }

    return this.prisma.vtcContract.create({
      data: {
        tenantId: tenantId.trim(),
        vehicleId: body.vehicleId.trim(),
        driverId: body.driverId.trim(),
        ownerId: body.ownerId?.trim() || null,
        contractType: body.contractType,
        status: body.status || 'brouillon',
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        dailyTarget: Number(body.dailyTarget || 0),
        weeklyTarget: Number(body.weeklyTarget || 0),
        monthlyTarget: Number(body.monthlyTarget || 0),
        fixedRentAmount: Number(body.fixedRentAmount || 0),
        depositAmount: Number(body.depositAmount || 0),
        companyPercent: Number(body.companyPercent || 0),
        ownerPercent: Number(body.ownerPercent || 0),
        driverPercent: Number(body.driverPercent || 0),
        notes: body.notes?.trim() || null,
      },
      include: {
        vehicle: true,
        driver: true,
        owner: true,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    await this.findOne(tenantId, id);

    if (body.ownerId?.trim()) {
      const owner = await this.prisma.owner.findFirst({
        where: {
          id: body.ownerId.trim(),
          tenantId: tenantId.trim(),
        },
      });

      if (!owner) {
        throw new NotFoundException('Propriétaire introuvable');
      }
    }

    return this.prisma.vtcContract.update({
      where: { id },
      data: {
        ownerId: body.ownerId?.trim() || null,
        contractType: body.contractType || undefined,
        status: body.status || undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : null,
        dailyTarget:
          body.dailyTarget !== undefined
            ? Number(body.dailyTarget)
            : undefined,
        weeklyTarget:
          body.weeklyTarget !== undefined
            ? Number(body.weeklyTarget)
            : undefined,
        monthlyTarget:
          body.monthlyTarget !== undefined
            ? Number(body.monthlyTarget)
            : undefined,
        fixedRentAmount:
          body.fixedRentAmount !== undefined
            ? Number(body.fixedRentAmount)
            : undefined,
        depositAmount:
          body.depositAmount !== undefined
            ? Number(body.depositAmount)
            : undefined,
        companyPercent:
          body.companyPercent !== undefined
            ? Number(body.companyPercent)
            : undefined,
        ownerPercent:
          body.ownerPercent !== undefined
            ? Number(body.ownerPercent)
            : undefined,
        driverPercent:
          body.driverPercent !== undefined
            ? Number(body.driverPercent)
            : undefined,
        notes: body.notes?.trim() || null,
      },
      include: {
        vehicle: true,
        driver: true,
        owner: true,
        driverPayments: true,
        ownerSettlements: true,
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findOne(tenantId, id);

    return this.prisma.vtcContract.update({
      where: { id },
      data: { status: status as any },
      include: {
        vehicle: true,
        driver: true,
        owner: true,
        driverPayments: true,
        ownerSettlements: true,
      },
    });
  }
}
