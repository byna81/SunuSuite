import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private resolvePeriod(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();

    if (period === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { gte: start, lte: end };
    }

    if (period === 'this_week') {
      const current = new Date();
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);

      const start = new Date(current);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { gte: start, lte: end };
    }

    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { gte: start, lte: end };
    }

    if (startDate || endDate) {
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

    return undefined;
  }

  async getSummary(
    tenantId: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.resolvePeriod(period, startDate, endDate);

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
    const refundsTotal = refunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );
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
        mode: period ?? 'custom',
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

  async getTopProducts(
    tenantId: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.resolvePeriod(period, startDate, endDate);

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
      {
        productId: string;
        name: string;
        quantitySold: number;
        revenue: number;
      }
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

  async getSales(
    tenantId: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.resolvePeriod(period, startDate, endDate);

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
