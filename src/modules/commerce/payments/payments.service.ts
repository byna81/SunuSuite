import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private readonly allowedMethods = [
    'cash',
    'wave',
    'orange_money',
    'card',
  ];

  async create(data: {
    saleId: string;
    method: string;
    amount: number;
    status?: string;
    reference?: string;
    phoneNumber?: string;
  }) {
    const method = String(data.method).trim().toLowerCase();

    if (!this.allowedMethods.includes(method)) {
      throw new BadRequestException(
        `Méthode invalide. Valeurs autorisées: ${this.allowedMethods.join(', ')}`,
      );
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: data.saleId },
      include: { payments: true },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${data.saleId} introuvable`);
    }

    if (!data.amount || Number(data.amount) <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    const alreadyPaid = (sale.payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const remaining = Number(sale.total) - alreadyPaid;

    if (Number(data.amount) > remaining) {
      throw new BadRequestException(`Montant trop élevé. Reste: ${remaining}`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        saleId: data.saleId,
        method,
        amount: Number(data.amount),
        status: data.status ?? 'paid',
        reference: data.reference ?? null,
        phoneNumber: data.phoneNumber ?? null,
      },
    });

    const newTotal = alreadyPaid + Number(data.amount);

    let saleStatus = 'unpaid';
    if (newTotal > 0 && newTotal < Number(sale.total)) {
      saleStatus = 'partial';
    } else if (newTotal >= Number(sale.total)) {
      saleStatus = 'paid';
    }

    await this.prisma.sale.update({
      where: { id: data.saleId },
      data: { status: saleStatus },
    });

    return payment;
  }

  async findBySale(saleId: string) {
    return this.prisma.payment.findMany({
      where: { saleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getMethods() {
    return this.allowedMethods.map((code) => ({ code }));
  }
}
