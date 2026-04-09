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

    const driver = await this.prisma.vtcDriver.findFirst({
      where: {
        id: body.driverId.trim(),
        tenantId: tenantId.trim(),
      },
    });

    if (!driver) {
      throw new NotFoundException('Chauffeur introuvable');
    }

    const expectedAmount = Number(body.expectedAmount || 0);
    const paidAmount = Number(body.paidAmount || 0);
    const remainingAmount =
      body.remainingAmount !== undefined
        ? Number(body.remainingAmount)
        : expectedAmount - paidAmount;

    return this.prisma.vtcDriverPayment.create({
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
        status:
          body.status ||
          (remainingAmount <= 0
            ? 'paid'
            : paidAmount > 0
              ? 'partial'
              : 'pending'),
      },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
    });
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

    return this.prisma.vtcDriverPayment.update({
      where: { id },
      data: {
        periodLabel: body.periodLabel?.trim() || undefined,
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
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status:
          body.status ||
          (remainingAmount <= 0
            ? 'paid'
            : paidAmount > 0
              ? 'partial'
              : 'pending'),
      },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
    });
  }
}
