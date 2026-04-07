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
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');

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

  async findOne(id: string) {
    const maintenance = await this.prisma.vehicleMaintenance.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!maintenance) throw new NotFoundException('Maintenance introuvable');
    return maintenance;
  }

  async create(body: any) {
    if (!body?.tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');
    if (!body?.vehicleId?.trim()) throw new BadRequestException('vehicleId obligatoire');
    if (!body?.type) throw new BadRequestException('type obligatoire');
    if (!body?.title?.trim()) throw new BadRequestException('title obligatoire');

    return this.prisma.vehicleMaintenance.create({
      data: {
        tenantId: body.tenantId.trim(),
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
          body.mileageAtService !== undefined ? Number(body.mileageAtService) : null,
        nextDueMileage:
          body.nextDueMileage !== undefined ? Number(body.nextDueMileage) : null,
        status: body.status || 'pending',
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);

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
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        performedDate: body.performedDate ? new Date(body.performedDate) : null,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
        mileageAtService:
          body.mileageAtService !== undefined ? Number(body.mileageAtService) : null,
        nextDueMileage:
          body.nextDueMileage !== undefined ? Number(body.nextDueMileage) : null,
        status: body.status || undefined,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);

    return this.prisma.vehicleMaintenance.update({
      where: { id },
      data: {
        status: status as any,
      },
    });
  }
}
