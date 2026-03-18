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

  async getTopProducts(tenantId: string) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
        },
      },
      include: {
        product: true,
      },
    });

    const map: Record<
      string,
      { productId: string; name: string; quantitySold: number; revenue: number }
    > = {};

    for (const item of items) {
      const key = item.productId;

      if (!map[key]) {
        map[key] = {
          productId: item.productId,
          name: item.product.name,
          quantitySold: 0,
          revenue: 0,
        };
      }

      map[key].quantitySold += item.quantity;
      map[key].revenue += Number(item.price) * item.quantity;
    }

    return Object.values(map).sort((a, b) => b.quantitySold - a.quantitySold);
  }

  async getTodaySales(tenantId: string) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
