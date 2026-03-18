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
      throw new Error(`Sale ${data.saleId} introuvable`);
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error('Montant invalide');
    }

    // sécurisation
    const payments = sale.payments || [];

    const alreadyPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const remaining = Number(sale.total) - alreadyPaid;

    if (data.amount > remaining) {
      throw new Error(`Montant trop élevé. Reste: ${remaining}`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        saleId: data.saleId,
        method: data.method,
        amount: Number(data.amount),
        status: data.status ?? 'paid',
      },
    });

    const newTotal = alreadyPaid + Number(data.amount);

    let status = 'unpaid';

    if (newTotal > 0 && newTotal < Number(sale.total)) {
      status = 'partial';
    } else if (newTotal === Number(sale.total)) {
      status = 'paid';
    }

    await this.prisma.sale.update({
      where: { id: data.saleId },
      data: { status },
    });

    return payment;
  }

  async findBySale(saleId: string) {
    return this.prisma.payment.findMany({
      where: { saleId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
