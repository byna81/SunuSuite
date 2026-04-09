import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VtcOwnerSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.vtcOwnerSettlement.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        contract: true,
        vehicle: true,
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const settlement = await this.prisma.vtcOwnerSettlement.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        contract: true,
        vehicle: true,
        owner: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException('Paiement propriétaire introuvable');
    }

    return settlement;
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.contractId?.trim()) {
      throw new BadRequestException('contractId obligatoire');
    }

    if (!body?.vehicleId?.trim()) {
      throw new BadRequestException('vehicleId obligatoire');
    }

    if (!body?.ownerId?.trim()) {
      throw new BadRequestException('ownerId obligatoire');
    }

    const contract = await this.prisma.vtcContract.findFirst({
      where: {
        id: body.contractId.trim(),
        tenantId: tenantId.trim(),
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
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

    const owner = await this.prisma.owner.findFirst({
      where: {
        id: body.ownerId.trim(),
        tenantId: tenantId.trim(),
      },
    });

    if (!owner) {
      throw new NotFoundException('Propriétaire introuvable');
    }

    const grossRevenue = Number(body.grossRevenue || 0);
    const companyShare = Number(body.companyShare || 0);
    const ownerShare = Number(body.ownerShare || 0);
    const driverShare = Number(body.driverShare || 0);
    const alreadyPaid = Number(body.alreadyPaid || 0);

    const remainingToPay =
      body.remainingToPay !== undefined
        ? Number(body.remainingToPay)
        : ownerShare - alreadyPaid;

    return this.prisma.vtcOwnerSettlement.create({
      data: {
        tenantId: tenantId.trim(),
        contractId: body.contractId.trim(),
        vehicleId: body.vehicleId.trim(),
        ownerId: body.ownerId.trim(),
        periodLabel: body.periodLabel?.trim() || null,
        grossRevenue,
        companyShare,
        ownerShare,
        driverShare,
        alreadyPaid,
        remainingToPay,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status:
          body.status ||
          (remainingToPay <= 0
            ? 'paid'
            : alreadyPaid > 0
              ? 'partial'
              : 'pending'),
      },
      include: {
        contract: true,
        vehicle: true,
        owner: true,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    const existing = await this.findOne(tenantId, id);

    const grossRevenue =
      body.grossRevenue !== undefined
        ? Number(body.grossRevenue)
        : Number(existing.grossRevenue || 0);

    const companyShare =
      body.companyShare !== undefined
        ? Number(body.companyShare)
        : Number(existing.companyShare || 0);

    const ownerShare =
      body.ownerShare !== undefined
        ? Number(body.ownerShare)
        : Number(existing.ownerShare || 0);

    const driverShare =
      body.driverShare !== undefined
        ? Number(body.driverShare)
        : Number(existing.driverShare || 0);

    const alreadyPaid =
      body.alreadyPaid !== undefined
        ? Number(body.alreadyPaid)
        : Number(existing.alreadyPaid || 0);

    const remainingToPay =
      body.remainingToPay !== undefined
        ? Number(body.remainingToPay)
        : ownerShare - alreadyPaid;

    return this.prisma.vtcOwnerSettlement.update({
      where: { id },
      data: {
        periodLabel: body.periodLabel?.trim() || undefined,
        grossRevenue:
          body.grossRevenue !== undefined ? grossRevenue : undefined,
        companyShare:
          body.companyShare !== undefined ? companyShare : undefined,
        ownerShare:
          body.ownerShare !== undefined ? ownerShare : undefined,
        driverShare:
          body.driverShare !== undefined ? driverShare : undefined,
        alreadyPaid:
          body.alreadyPaid !== undefined ? alreadyPaid : undefined,
        remainingToPay,
        paymentDate:
          body.paymentDate !== undefined
            ? body.paymentDate
              ? new Date(body.paymentDate)
              : null
            : undefined,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status:
          body.status ||
          (remainingToPay <= 0
            ? 'paid'
            : alreadyPaid > 0
              ? 'partial'
              : 'pending'),
      },
      include: {
        contract: true,
        vehicle: true,
        owner: true,
      },
    });
  }
}
