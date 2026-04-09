import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.vehicleAssignment.findMany({
      where: { tenantId: tenantId.trim() },
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
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

    const activeAssignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        tenantId: tenantId.trim(),
        vehicleId: body.vehicleId.trim(),
        isActive: true,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException('Ce véhicule est déjà affecté');
    }

    const activeDriverAssignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        tenantId: tenantId.trim(),
        driverId: body.driverId.trim(),
        isActive: true,
      },
    });

    if (activeDriverAssignment) {
      throw new BadRequestException('Ce chauffeur a déjà un véhicule affecté');
    }

    return this.prisma.vehicleAssignment.create({
      data: {
        tenantId: tenantId.trim(),
        vehicleId: body.vehicleId.trim(),
        driverId: body.driverId.trim(),
        assignedAt: body.assignedAt ? new Date(body.assignedAt) : new Date(),
        note: body.note?.trim() || null,
        isActive: true,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async unassign(tenantId: string, id: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const assignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
    });

    if (!assignment) {
      throw new NotFoundException('Affectation introuvable');
    }

    return this.prisma.vehicleAssignment.update({
      where: { id },
      data: {
        isActive: false,
        unassignedAt: body?.unassignedAt
          ? new Date(body.unassignedAt)
          : new Date(),
        note: body?.note?.trim() || assignment.note,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }
}
