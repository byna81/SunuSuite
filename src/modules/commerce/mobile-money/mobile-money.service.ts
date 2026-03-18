import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MobileMoneyService {
  constructor(private prisma: PrismaService) {}

  async initiate(data: {
    saleId: string;
    provider: 'wave' | 'orange_money';
    amount: number;
    phoneNumber: string;
  }) {
    const provider = String(data.provider).trim().toLowerCase();

    if (!['wave', 'orange_money'].includes(provider)) {
      throw new BadRequestException(
        'Provider invalide. Valeurs autorisées: wave, orange_money',
      );
    }

    if (!data.phoneNumber) {
      throw new BadRequestException('Numéro de téléphone obligatoire');
    }

    if (!data.amount || Number(data.amount) <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: data.saleId },
      include: { payments: true },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${data.saleId} introuvable`);
    }

    const alreadyPaid = (sale.payments ?? [])
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remaining = Number(sale.total) - alreadyPaid;

    if (Number(data.amount) > remaining) {
      throw new BadRequestException(`Montant trop élevé. Reste: ${remaining}`);
    }

    const reference = `${provider.toUpperCase()}-${Date.now()}`;

    const payment = await this.prisma.payment.create({
      data: {
        saleId: data.saleId,
        method: provider,
        provider,
        amount: Number(data.amount),
        status: 'pending',
        phoneNumber: data.phoneNumber,
        reference,
      },
    });

    return {
      message: 'Paiement mobile money initié',
      paymentId: payment.id,
      saleId: payment.saleId,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      phoneNumber: payment.phoneNumber,
      reference: payment.reference,
    };
  }

  async confirmByPaymentId(paymentId: string, providerRef?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} introuvable`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'paid',
        providerRef: providerRef ?? payment.providerRef ?? null,
      },
    });

    await this.syncSaleStatus(updated.saleId);

    return updated;
  }

  async failByPaymentId(paymentId: string, providerRef?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} introuvable`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        providerRef: providerRef ?? payment.providerRef ?? null,
      },
    });

    await this.syncSaleStatus(updated.saleId);

    return updated;
  }

  async handleWebhook(data: {
    paymentId: string;
    providerRef?: string;
    status: 'paid' | 'failed';
  }) {
    if (!data.paymentId) {
      throw new BadRequestException('paymentId obligatoire');
    }

    if (!['paid', 'failed'].includes(data.status)) {
      throw new BadRequestException('status invalide. Valeurs autorisées: paid, failed');
    }

    if (data.status === 'paid') {
      return this.confirmByPaymentId(data.paymentId, data.providerRef);
    }

    return this.failByPaymentId(data.paymentId, data.providerRef);
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
