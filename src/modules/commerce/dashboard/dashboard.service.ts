import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      include: { payments: true },
    });

    const productsCount = await this.prisma.product.count({
      where: { tenantId },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const salesCount = sales.length;

    const paymentsByMethodMap: Record<string, number> = {};

    for (const sale of sales) {
      for (const payment of sale.payments) {
        const method = payment.method;
        paymentsByMethodMap[method] =
          (paymentsByMethodMap[method] || 0) + Number(payment.amount);
      }
    }

    const paymentsByMethod = Object.entries(paymentsByMethodMap).map(
      ([method, amount]) => ({
        method,
        amount,
      }),
    );

    return {
      tenantId,
      totalRevenue,
      salesCount,
      productsCount,
      paymentsByMethod,
    };
  }
}
