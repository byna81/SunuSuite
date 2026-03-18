import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

    const paidPayments = (sale.payments ?? []).filter(
      (p) => p.status === 'paid',
    );

    const alreadyPaid = paidPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const remaining = Number(sale.total) - alreadyPaid;

    if (Number(data.amount) > remaining) {
      throw new BadRequestException(`Montant trop élevé. Reste: ${remaining}`);
    }

    let paymentStatus = data.status ?? 'paid';

    if (method === 'wave' || method === 'orange_money') {
      paymentStatus = data.status ?? 'pending';
    }

    const payment = await this.prisma.payment.create({
      data: {
        saleId: data.saleId,
        method,
        amount: Number(data.amount),
        status: paymentStatus,
        reference: data.reference ?? null,
        phoneNumber: data.phoneNumber ?? null,
      },
    });

    await this.syncSaleStatus(data.saleId);

    return payment;
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} introuvable`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'paid' },
    });

    await this.syncSaleStatus(payment.saleId);

    return updated;
  }

  async failPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} introuvable`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'failed' },
    });

    await this.syncSaleStatus(payment.saleId);

    return updated;
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

  private async syncSaleStatus(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${saleId} introuvable`);
    }

    const paidTotal = (sale.payments ?? [])
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    let saleStatus = 'unpaid';

    if (paidTotal > 0 && paidTotal < Number(sale.total)) {
      saleStatus = 'partial';
    } else if (paidTotal >= Number(sale.total)) {
      saleStatus = 'paid';
    }

    await this.prisma.sale.update({
      where: { id: saleId },
      data: { status: saleStatus },
    });
  }
}
