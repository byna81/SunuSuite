import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VtcDriverPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.vtcDriverPayment.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const payment = await this.prisma.vtcDriverPayment.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Versement chauffeur introuvable');
    }

    return payment;
  }

  private computePaymentStatus(expectedAmount: number, paidAmount: number) {
    const remainingAmount = expectedAmount - paidAmount;

    if (remainingAmount <= 0) {
      return 'paid';
    }

    if (paidAmount > 0) {
      return 'partial';
    }

    return 'pending';
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

    if (!body?.driverId?.trim()) {
      throw new BadRequestException('driverId obligatoire');
    }

    const contract = await this.prisma.vtcContract.findFirst({
      where: {
        id: body.contractId.trim(),
        tenantId: tenantId.trim(),
      },
      include: {
        vehicle: true,
        owner: true,
        driver: true,
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
      include: {
        owner: true,
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

    if (contract.vehicleId !== vehicle.id) {
      throw new BadRequestException(
        'Le véhicule sélectionné ne correspond pas au contrat',
      );
    }

    if (contract.driverId !== driver.id) {
      throw new BadRequestException(
        'Le chauffeur sélectionné ne correspond pas au contrat',
      );
    }

    const expectedAmount = Number(body.expectedAmount || 0);
    const paidAmount = Number(body.paidAmount || 0);

    if (expectedAmount < 0) {
      throw new BadRequestException(
        'Le montant attendu ne peut pas être négatif',
      );
    }

    if (paidAmount < 0) {
      throw new BadRequestException(
        'Le montant payé ne peut pas être négatif',
      );
    }

    const remainingAmount =
      body.remainingAmount !== undefined && body.remainingAmount !== null
        ? Number(body.remainingAmount)
        : expectedAmount - paidAmount;

    const status =
      body.status ||
      this.computePaymentStatus(expectedAmount, paidAmount);

    const createdPayment = await this.prisma.vtcDriverPayment.create({
      data: {
        tenantId: tenantId.trim(),
        contractId: body.contractId.trim(),
        vehicleId: body.vehicleId.trim(),
        driverId: body.driverId.trim(),
        periodLabel: body.periodLabel?.trim() || null,
        expectedAmount,
        paidAmount,
        remainingAmount,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status,
      },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
    });

    const ownerId = contract.ownerId || vehicle.ownerId || null;

    console.log('DEBUG VTC PAYMENT', {
      contractId: contract.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      contractOwnerId: contract.ownerId,
      vehicleOwnerId: vehicle.ownerId,
      resolvedOwnerId: ownerId,
      paidAmount,
      periodLabel: body.periodLabel?.trim() || null,
    });

    if (ownerId && paidAmount > 0) {
      console.log('DEBUG owner settlement block entered');

      const companyPercent = Number(contract.companyPercent || 0);
      const ownerPercent = Number(contract.ownerPercent || 0);
      const driverPercent = Number(contract.driverPercent || 0);

      const companyShare = (paidAmount * companyPercent) / 100;
      const ownerShare = (paidAmount * ownerPercent) / 100;
      const driverShare = (paidAmount * driverPercent) / 100;

      const existingSettlement =
        await this.prisma.vtcOwnerSettlement.findFirst({
          where: {
            tenantId: tenantId.trim(),
            contractId: contract.id,
            vehicleId: vehicle.id,
            ownerId,
            periodLabel: body.periodLabel?.trim() || null,
          },
        });

      if (existingSettlement) {
        console.log(
          'DEBUG owner settlement update',
          existingSettlement.id,
        );

        const nextGrossRevenue =
          Number(existingSettlement.grossRevenue || 0) + paidAmount;
        const nextCompanyShare =
          Number(existingSettlement.companyShare || 0) + companyShare;
        const nextOwnerShare =
          Number(existingSettlement.ownerShare || 0) + ownerShare;
        const nextDriverShare =
          Number(existingSettlement.driverShare || 0) + driverShare;
        const alreadyPaid = Number(existingSettlement.alreadyPaid || 0);
        const nextRemainingToPay = nextOwnerShare - alreadyPaid;

        await this.prisma.vtcOwnerSettlement.update({
          where: { id: existingSettlement.id },
          data: {
            grossRevenue: nextGrossRevenue,
            companyShare: nextCompanyShare,
            ownerShare: nextOwnerShare,
            driverShare: nextDriverShare,
            remainingToPay: nextRemainingToPay,
            status:
              nextRemainingToPay <= 0
                ? 'paid'
                : alreadyPaid > 0
                  ? 'partial'
                  : 'pending',
          },
        });
      } else {
        console.log('DEBUG owner settlement create');

        await this.prisma.vtcOwnerSettlement.create({
          data: {
            tenantId: tenantId.trim(),
            contractId: contract.id,
            vehicleId: vehicle.id,
            ownerId,
            periodLabel: body.periodLabel?.trim() || null,
            grossRevenue: paidAmount,
            companyShare,
            ownerShare,
            driverShare,
            alreadyPaid: 0,
            remainingToPay: ownerShare,
            paymentDate: null,
            paymentMethod: null,
            reference: null,
            note: `Généré automatiquement depuis le versement chauffeur ${createdPayment.id}`,
            status: ownerShare <= 0 ? 'paid' : 'pending',
          },
        });
      }
    } else {
      console.log('DEBUG owner settlement skipped', {
        resolvedOwnerId: ownerId,
        paidAmount,
      });
    }

    return this.findOne(tenantId, createdPayment.id);
  }

  async update(tenantId: string, id: string, body: any) {
    const existing = await this.findOne(tenantId, id);

    const expectedAmount =
      body.expectedAmount !== undefined
        ? Number(body.expectedAmount)
        : Number(existing.expectedAmount || 0);

    const paidAmount =
      body.paidAmount !== undefined
        ? Number(body.paidAmount)
        : Number(existing.paidAmount || 0);

    const remainingAmount =
      body.remainingAmount !== undefined
        ? Number(body.remainingAmount)
        : expectedAmount - paidAmount;

    const updated = await this.prisma.vtcDriverPayment.update({
      where: { id },
      data: {
        periodLabel:
          body.periodLabel !== undefined
            ? body.periodLabel?.trim() || null
            : undefined,
        expectedAmount:
          body.expectedAmount !== undefined ? expectedAmount : undefined,
        paidAmount: body.paidAmount !== undefined ? paidAmount : undefined,
        remainingAmount,
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
          body.note !== undefined ? body.note?.trim() || null : undefined,
        status:
          body.status ||
          this.computePaymentStatus(expectedAmount, paidAmount),
      },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
    });

    return updated;
  }
}
