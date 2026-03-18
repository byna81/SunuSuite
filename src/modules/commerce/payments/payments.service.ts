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
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: data.saleId },
        include: { payments: true },
      });

      if (!sale) {
        throw new Error(`Sale avec id ${data.saleId} introuvable`);
      }

      if (data.amount <= 0) {
        throw new Error('Le montant doit être supérieur à 0');
      }

      const alreadyPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = sale.total - alreadyPaid;

      if (data.amount > remaining) {
        throw new Error(`Montant trop élevé. Reste à payer: ${remaining}`);
      }

      const payment = await tx.payment.create({
        data: {
          saleId: data.saleId,
          method: data.method,
          amount: Number(data.amount),
          status: data.status ?? 'paid',
        },
      });

      const newPaidTotal = alreadyPaid + Number(data.amount);

      let saleStatus = 'unpaid';
      if (newPaidTotal > 0 && newPaidTotal < sale.total) {
        saleStatus = 'partial';
      } else if (newPaidTotal === sale.total) {
        saleStatus = 'paid';
      }

      await tx.sale.update({
        where: { id: data.saleId },
        data: { status: saleStatus },
      });

      return payment;
    });
  }

  async findBySale(saleId: string) {
    return this.prisma.payment.findMany({
      where: { saleId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
