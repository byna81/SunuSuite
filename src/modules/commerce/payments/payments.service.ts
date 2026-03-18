import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    saleId: string;
    method: string;
    amount: number;
    status?: string;
  }) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: data.saleId },
      include: { payments: true },
    });

    if (!sale) {
      throw new Error('Vente introuvable');
    }

    const alreadyPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = sale.total - alreadyPaid;

    if (data.amount > remaining) {
      throw new Error(`Montant trop élevé. Reste à payer: ${remaining}`);
    }

    return this.prisma.payment.create({
      data: {
        saleId: data.saleId,
        method: data.method,
        amount: Number(data.amount),
        status: data.status ?? 'paid',
      },
    });
  }

  async findBySale(saleId: string) {
    return this.prisma.payment.findMany({
      where: { saleId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
