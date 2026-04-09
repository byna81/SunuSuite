import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleMaintenancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, vehicleId?: string, status?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.vehicleMaintenance.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(vehicleId ? { vehicleId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const maintenance = await this.prisma.vehicleMaintenance.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        vehicle: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance introuvable');
    }

    return maintenance;
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.vehicleId?.trim()) {
      throw new BadRequestException('vehicleId obligatoire');
    }

    if (!body?.type) {
      throw new BadRequestException('type obligatoire');
    }

    if (!body?.title?.trim()) {
      throw new BadRequestException('title obligatoire');
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

    return this.prisma.vehicleMaintenance.create({
      data: {
        tenantId: tenantId.trim(),
        vehicleId: body.vehicleId.trim(),
        type: body.type,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        supplier: body.supplier?.trim() || null,
        estimatedCost: Number(body.estimatedCost || 0),
        actualCost: Number(body.actualCost || 0),
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        performedDate: body.performedDate ? new Date(body.performedDate) : null,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
        mileageAtService:
          body.mileageAtService !== undefined &&
          body.mileageAtService !== null &&
          body.mileageAtService !== ''
            ? Number(body.mileageAtService)
            : null,
        nextDueMileage:
          body.nextDueMileage !== undefined &&
          body.nextDueMileage !== null &&
          body.nextDueMileage !== ''
            ? Number(body.nextDueMileage)
            : null,
        status: body.status || 'pending',
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    await this.findOne(tenantId, id);

    return this.prisma.vehicleMaintenance.update({
      where: { id },
      data: {
        type: body.type || undefined,
        title: body.title?.trim() || undefined,
        description: body.description?.trim() || null,
        supplier: body.supplier?.trim() || null,
        estimatedCost:
          body.estimatedCost !== undefined ? Number(body.estimatedCost) : undefined,
        actualCost:
          body.actualCost !== undefined ? Number(body.actualCost) : undefined,
        scheduledDate:
          body.scheduledDate !== undefined
            ? body.scheduledDate
              ? new Date(body.scheduledDate)
              : null
            : undefined,
        performedDate:
          body.performedDate !== undefined
            ? body.performedDate
              ? new Date(body.performedDate)
              : null
            : undefined,
        nextDueDate:
          body.nextDueDate !== undefined
            ? body.nextDueDate
              ? new Date(body.nextDueDate)
              : null
            : undefined,
        mileageAtService:
          body.mileageAtService !== undefined
            ? body.mileageAtService === null || body.mileageAtService === ''
              ? null
              : Number(body.mileageAtService)
            : undefined,
        nextDueMileage:
          body.nextDueMileage !== undefined
            ? body.nextDueMileage === null || body.nextDueMileage === ''
              ? null
              : Number(body.nextDueMileage)
            : undefined,
        status: body.status || undefined,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findOne(tenantId, id);

    return this.prisma.vehicleMaintenance.update({
      where: { id },
      data: {
        status: status as any,
      },
      include: {
        vehicle: true,
      },
    });
  }
}
