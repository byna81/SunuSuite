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

  async create(body: any) {
    if (!body?.tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');
    if (!body?.vehicleId?.trim()) throw new BadRequestException('vehicleId obligatoire');
    if (!body?.driverId?.trim()) throw new BadRequestException('driverId obligatoire');

    const activeAssignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        tenantId: body.tenantId.trim(),
        vehicleId: body.vehicleId.trim(),
        isActive: true,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException('Ce véhicule est déjà affecté');
    }

    return this.prisma.vehicleAssignment.create({
      data: {
        tenantId: body.tenantId.trim(),
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

  async unassign(id: string, body: any) {
    const assignment = await this.prisma.vehicleAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Affectation introuvable');
    }

    return this.prisma.vehicleAssignment.update({
      where: { id },
      data: {
        isActive: false,
        unassignedAt: body?.unassignedAt ? new Date(body.unassignedAt) : new Date(),
        note: body?.note?.trim() || assignment.note,
      },
    });
  }
}
