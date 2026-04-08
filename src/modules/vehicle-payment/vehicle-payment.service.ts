import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, VehiclePaymentType } from '@prisma/client';

@Injectable()
export class VehiclePaymentService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, paymentType?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const where: Prisma.VehiclePaymentWhereInput = {
      tenantId: tenantId.trim(),
    };

    if (paymentType) {
      if (paymentType !== 'sale' && paymentType !== 'rental') {
        throw new BadRequestException('paymentType invalide');
      }

      where.paymentType = paymentType as VehiclePaymentType;
    }

    return this.prisma.vehiclePayment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        saleContract: true,
        rentalContract: true,
      },
    });
  }

  async create(data: any) {
    if (!data?.tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!data?.paymentType) {
      throw new BadRequestException('paymentType obligatoire');
    }

    if (data.paymentType !== 'sale' && data.paymentType !== 'rental') {
      throw new BadRequestException('paymentType invalide');
    }

    if (!data?.amount || Number(data.amount) <= 0) {
      throw new BadRequestException('amount obligatoire');
    }

    if (!data?.paymentMethod?.trim()) {
      throw new BadRequestException('paymentMethod obligatoire');
    }

    if (data.paymentType === 'sale' && !data?.saleContractId?.trim()) {
      throw new BadRequestException('saleContractId obligatoire');
    }

    if (data.paymentType === 'rental' && !data?.rentalContractId?.trim()) {
      throw new BadRequestException('rentalContractId obligatoire');
    }

    return this.prisma.vehiclePayment.create({
      data: {
        tenantId: data.tenantId.trim(),
        paymentType: data.paymentType as VehiclePaymentType,
        saleContractId: data.saleContractId?.trim() || null,
        rentalContractId: data.rentalContractId?.trim() || null,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod.trim(),
        reference: data.reference?.trim() || null,
        note: data.note?.trim() || null,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      },
      include: {
        saleContract: true,
        rentalContract: true,
      },
    });
  }
}
