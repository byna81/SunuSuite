import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReceiptService {
  constructor(private prisma: PrismaService) {}

  async getReceipt(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${saleId} introuvable`);
    }

    const paidAmount = (sale.payments ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    const balance = Number(sale.total) - paidAmount;

    const items = sale.items.map((item) => ({
      productId: item.productId,
      productName: item.product?.name ?? 'Produit',
      quantity: item.quantity,
      unitPrice: Number(item.price),
      lineTotal: Number(item.price) * item.quantity,
    }));

    const payments = sale.payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: Number(payment.amount),
      status: payment.status,
      reference: payment.reference ?? null,
      phoneNumber: payment.phoneNumber ?? null,
      createdAt: payment.createdAt,
    }));

    return {
      saleId: sale.id,
      tenantId: sale.tenantId,
      createdAt: sale.createdAt,
      status: sale.status,
      total: Number(sale.total),
      paidAmount,
      balance,
      items,
      payments,
    };
  }
}
