import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclePaymentService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, paymentType?: string) {
    return this.prisma.vehiclePayment.findMany({
      where: {
        tenantId,
        ...(paymentType && { paymentType }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: any) {
    return this.prisma.vehiclePayment.create({
      data: {
        tenantId: data.tenantId,
        paymentType: data.paymentType,
        saleContractId: data.saleContractId || null,
        rentalContractId: data.rentalContractId || null,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        reference: data.reference || null,
        note: data.note || null,
      },
    });
  }
}
