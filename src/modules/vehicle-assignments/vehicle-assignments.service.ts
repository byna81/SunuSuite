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

    const cleanTenantId = tenantId.trim();
    const cleanVehicleId = body.vehicleId.trim();
    const cleanDriverId = body.driverId.trim();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: cleanVehicleId,
        tenantId: cleanTenantId,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Véhicule introuvable');
    }

    const driver = await this.prisma.vtcDriver.findFirst({
      where: {
        id: cleanDriverId,
        tenantId: cleanTenantId,
      },
    });

    if (!driver) {
      throw new NotFoundException('Chauffeur introuvable');
    }

    const activeAssignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        tenantId: cleanTenantId,
        vehicleId: cleanVehicleId,
        isActive: true,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException('Ce véhicule est déjà affecté');
    }

    const activeDriverAssignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        tenantId: cleanTenantId,
        driverId: cleanDriverId,
        isActive: true,
      },
    });

    if (activeDriverAssignment) {
      throw new BadRequestException('Ce chauffeur a déjà un véhicule affecté');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.vehicleAssignment.create({
        data: {
          tenantId: cleanTenantId,
          vehicleId: cleanVehicleId,
          driverId: cleanDriverId,
          assignedAt: body.assignedAt ? new Date(body.assignedAt) : new Date(),
          note: body.note?.trim() || null,
          isActive: true,
        },
        include: {
          vehicle: true,
          driver: true,
        },
      });

      await tx.vehicle.update({
        where: { id: cleanVehicleId },
        data: {
          status: 'indisponible',
        },
      });

      return assignment;
    });

    return result;
  }

  async unassign(tenantId: string, id: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const cleanTenantId = tenantId.trim();

    const assignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        id,
        tenantId: cleanTenantId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Affectation introuvable');
    }

    if (!assignment.isActive) {
      throw new BadRequestException('Cette affectation est déjà inactive');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.vehicleAssignment.update({
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

      const anotherActiveAssignment = await tx.vehicleAssignment.findFirst({
        where: {
          tenantId: cleanTenantId,
          vehicleId: assignment.vehicleId,
          isActive: true,
          id: {
            not: id,
          },
        },
      });

      if (!anotherActiveAssignment) {
        await tx.vehicle.update({
          where: { id: assignment.vehicleId },
          data: {
            status: 'disponible',
          },
        });
      }

      return updatedAssignment;
    });

    return result;
  }
}
