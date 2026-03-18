import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return undefined;
    }

    const filter: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('startDate invalide');
      }
      start.setHours(0, 0, 0, 0);
      filter.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new BadRequestException('endDate invalide');
      }
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }

    return filter;
  }

  async getSummary(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { payments: true },
    });

    const refunds = await this.prisma.refund.findMany({
      where: {
        saleReturn: {
          tenantId,
        },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const productsCount = await this.prisma.product.count({
      where: { tenantId },
    });

    const grossRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const refundsTotal = refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    const netRevenue = grossRevenue - refundsTotal;
    const salesCount = sales.length;

    const paymentsByMethodMap: Record<string, number> = {};

    for (const sale of sales) {
      for (const payment of sale.payments) {
        if (payment.status !== 'paid') continue;

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
      period: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
      grossRevenue,
      refundsTotal,
      netRevenue,
      salesCount,
      productsCount,
      paymentsByMethod,
    };
  }

  async getTopProducts(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
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

  async getSales(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    return this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
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
