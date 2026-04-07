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
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');

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

  async findOne(id: string) {
    const settlement = await this.prisma.vtcOwnerSettlement.findUnique({
      where: { id },
      include: {
        contract: true,
        vehicle: true,
        owner: true,
      },
    });

    if (!settlement) throw new NotFoundException('Paiement propriétaire introuvable');
    return settlement;
  }

  async create(body: any) {
    if (!body?.tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');
    if (!body?.contractId?.trim()) throw new BadRequestException('contractId obligatoire');
    if (!body?.vehicleId?.trim()) throw new BadRequestException('vehicleId obligatoire');
    if (!body?.ownerId?.trim()) throw new BadRequestException('ownerId obligatoire');

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
        tenantId: body.tenantId.trim(),
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
        status: body.status || (remainingToPay <= 0 ? 'paid' : alreadyPaid > 0 ? 'partial' : 'pending'),
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);

    return this.prisma.vtcOwnerSettlement.update({
      where: { id },
      data: {
        periodLabel: body.periodLabel?.trim() || undefined,
        grossRevenue:
          body.grossRevenue !== undefined ? Number(body.grossRevenue) : undefined,
        companyShare:
          body.companyShare !== undefined ? Number(body.companyShare) : undefined,
        ownerShare:
          body.ownerShare !== undefined ? Number(body.ownerShare) : undefined,
        driverShare:
          body.driverShare !== undefined ? Number(body.driverShare) : undefined,
        alreadyPaid:
          body.alreadyPaid !== undefined ? Number(body.alreadyPaid) : undefined,
        remainingToPay:
          body.remainingToPay !== undefined ? Number(body.remainingToPay) : undefined,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status: body.status || undefined,
      },
    });
  }
}
