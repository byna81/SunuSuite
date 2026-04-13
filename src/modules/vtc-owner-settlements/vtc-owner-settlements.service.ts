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
        contract: {
          include: {
            driver: true,
          },
        },
        vehicle: {
          include: {
            owner: true,
          },
        },
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
        contract: {
          include: {
            driver: true,
          },
        },
        vehicle: {
          include: {
            owner: true,
          },
        },
        owner: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException('Paiement propriétaire introuvable');
    }

    return settlement;
  }

  private roundAmount(value: number) {
    return Math.round(Number(value || 0));
  }

  private computeStatus(alreadyPaid: number, remainingToPay: number) {
    if (remainingToPay <= 0) return 'paid';
    if (alreadyPaid > 0) return 'partial';
    return 'pending';
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.contractId?.trim()) {
      throw new BadRequestException('contractId obligatoire');
    }

    if (!body?.periodLabel?.trim()) {
      throw new BadRequestException('periodLabel obligatoire');
    }

    const contract = await this.prisma.vtcContract.findFirst({
      where: {
        id: body.contractId.trim(),
        tenantId: tenantId.trim(),
      },
      include: {
        vehicle: {
          include: {
            owner: true,
          },
        },
        owner: true,
        driver: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
    }

    const ownerId = contract.ownerId || contract.vehicle?.ownerId || null;
    const vehicleId = contract.vehicleId;

    if (!vehicleId) {
      throw new NotFoundException('Véhicule introuvable pour ce contrat');
    }

    if (!ownerId) {
      throw new BadRequestException(
        'Aucun propriétaire n’est défini pour ce contrat ou ce véhicule',
      );
    }

    const existingSettlement = await this.prisma.vtcOwnerSettlement.findFirst({
      where: {
        tenantId: tenantId.trim(),
        contractId: contract.id,
        periodLabel: body.periodLabel.trim(),
      },
    });

    if (existingSettlement) {
      throw new BadRequestException(
        'Un paiement propriétaire existe déjà pour ce contrat et cette période',
      );
    }

    const driverPayments = await this.prisma.vtcDriverPayment.findMany({
      where: {
        tenantId: tenantId.trim(),
        contractId: contract.id,
        periodLabel: body.periodLabel.trim(),
      },
    });

    const grossRevenue = this.roundAmount(
      driverPayments.reduce(
        (sum, item) => sum + Number(item.paidAmount || 0),
        0,
      ),
    );

    const companyPercent = Number(contract.companyPercent || 0);
    const ownerPercent = Number(contract.ownerPercent || 0);
    const driverPercent = Number(contract.driverPercent || 0);

    const computedCompanyShare = this.roundAmount(
      (grossRevenue * companyPercent) / 100,
    );
    const computedOwnerShare = this.roundAmount(
      (grossRevenue * ownerPercent) / 100,
    );
    const computedDriverShare = this.roundAmount(
      (grossRevenue * driverPercent) / 100,
    );

    const alreadyPaid = this.roundAmount(
      body.alreadyPaid !== undefined
        ? Number(body.alreadyPaid)
        : computedOwnerShare,
    );

    const remainingToPay = this.roundAmount(
      body.remainingToPay !== undefined
        ? Number(body.remainingToPay)
        : computedOwnerShare - alreadyPaid,
    );

    const status =
      body.status ||
      this.computeStatus(alreadyPaid, remainingToPay);

    return this.prisma.vtcOwnerSettlement.create({
      data: {
        tenantId: tenantId.trim(),
        contractId: contract.id,
        vehicleId,
        ownerId,
        periodLabel: body.periodLabel.trim(),
        grossRevenue,
        companyShare:
          body.companyShare !== undefined
            ? this.roundAmount(Number(body.companyShare))
            : computedCompanyShare,
        ownerShare:
          body.ownerShare !== undefined
            ? this.roundAmount(Number(body.ownerShare))
            : computedOwnerShare,
        driverShare:
          body.driverShare !== undefined
            ? this.roundAmount(Number(body.driverShare))
            : computedDriverShare,
        alreadyPaid,
        remainingToPay,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status,
      },
      include: {
        contract: {
          include: {
            driver: true,
          },
        },
        vehicle: {
          include: {
            owner: true,
          },
        },
        owner: true,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    const existing = await this.findOne(tenantId, id);

    const grossRevenue =
      body.grossRevenue !== undefined
        ? this.roundAmount(Number(body.grossRevenue))
        : this.roundAmount(Number(existing.grossRevenue || 0));

    const companyShare =
      body.companyShare !== undefined
        ? this.roundAmount(Number(body.companyShare))
        : this.roundAmount(Number(existing.companyShare || 0));

    const ownerShare =
      body.ownerShare !== undefined
        ? this.roundAmount(Number(body.ownerShare))
        : this.roundAmount(Number(existing.ownerShare || 0));

    const driverShare =
      body.driverShare !== undefined
        ? this.roundAmount(Number(body.driverShare))
        : this.roundAmount(Number(existing.driverShare || 0));

    const alreadyPaid =
      body.alreadyPaid !== undefined
        ? this.roundAmount(Number(body.alreadyPaid))
        : this.roundAmount(Number(existing.alreadyPaid || 0));

    const remainingToPay =
      body.remainingToPay !== undefined
        ? this.roundAmount(Number(body.remainingToPay))
        : this.roundAmount(ownerShare - alreadyPaid);

    return this.prisma.vtcOwnerSettlement.update({
      where: { id },
      data: {
        periodLabel:
          body.periodLabel !== undefined
            ? body.periodLabel?.trim() || null
            : undefined,
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
        paymentMethod:
          body.paymentMethod !== undefined
            ? body.paymentMethod?.trim() || null
            : undefined,
        reference:
          body.reference !== undefined
            ? body.reference?.trim() || null
            : undefined,
        note:
          body.note !== undefined
            ? body.note?.trim() || null
            : undefined,
        status:
          body.status ||
          this.computeStatus(alreadyPaid, remainingToPay),
      },
      include: {
        contract: {
          include: {
            driver: true,
          },
        },
        vehicle: {
          include: {
            owner: true,
          },
        },
        owner: true,
      },
    });
  }
}
