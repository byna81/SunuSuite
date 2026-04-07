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
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');

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

  async findOne(id: string) {
    const payment = await this.prisma.vtcDriverPayment.findUnique({
      where: { id },
      include: {
        contract: true,
        vehicle: true,
        driver: true,
      },
    });

    if (!payment) throw new NotFoundException('Versement chauffeur introuvable');
    return payment;
  }

  async create(body: any) {
    if (!body?.tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');
    if (!body?.contractId?.trim()) throw new BadRequestException('contractId obligatoire');
    if (!body?.vehicleId?.trim()) throw new BadRequestException('vehicleId obligatoire');
    if (!body?.driverId?.trim()) throw new BadRequestException('driverId obligatoire');

    const expectedAmount = Number(body.expectedAmount || 0);
    const paidAmount = Number(body.paidAmount || 0);
    const remainingAmount =
      body.remainingAmount !== undefined
        ? Number(body.remainingAmount)
        : expectedAmount - paidAmount;

    return this.prisma.vtcDriverPayment.create({
      data: {
        tenantId: body.tenantId.trim(),
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
        status: body.status || (remainingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'),
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);

    return this.prisma.vtcDriverPayment.update({
      where: { id },
      data: {
        periodLabel: body.periodLabel?.trim() || undefined,
        expectedAmount:
          body.expectedAmount !== undefined ? Number(body.expectedAmount) : undefined,
        paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : undefined,
        remainingAmount:
          body.remainingAmount !== undefined ? Number(body.remainingAmount) : undefined,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        status: body.status || undefined,
      },
    });
  }
}
