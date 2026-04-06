import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type DashboardQuery = {
  tenantId: string;
  period?: string;
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(query: DashboardQuery) {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();

    if (query.startDate && query.endDate) {
      start = new Date(query.startDate);
      end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    switch (query.period) {
      case 'this_week': {
        const currentDay = now.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1;
        start = new Date(now);
        start.setDate(now.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        break;
      }

      case 'this_month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      }

      case 'today':
      default: {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      }
    }

    end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  async getSummary(query: DashboardQuery) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const { start, end } = this.getDateRange(query);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        payments: true,
        returns: {
          include: {
            refunds: true,
          },
        },
      },
    });

    const productsCount = await this.prisma.product.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const grossRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

    const refundsTotal = sales.reduce((sum, sale) => {
      const saleRefunds = sale.returns.reduce((returnsSum, saleReturn) => {
        const refundAmount = saleReturn.refunds.reduce(
          (refundsSum, refund) => refundsSum + Number(refund.amount || 0),
          0,
        );
        return returnsSum + refundAmount;
      }, 0);

      return sum + saleRefunds;
    }, 0);

    const netRevenue = grossRevenue - refundsTotal;

    const paymentsByMethodMap = new Map<string, number>();

    sales.forEach((sale) => {
      sale.payments.forEach((payment) => {
        const key = String(payment.method || 'unknown');
        const current = paymentsByMethodMap.get(key) || 0;
        paymentsByMethodMap.set(key, current + Number(payment.amount || 0));
      });
    });

    const paymentsByMethod = Array.from(paymentsByMethodMap.entries()).map(
      ([method, amount]) => ({
        method,
        amount,
      }),
    );

    return {
      grossRevenue,
      refundsTotal,
      netRevenue,
      salesCount: sales.length,
      productsCount,
      paymentsByMethod,
    };
  }

  async getTopProducts(query: DashboardQuery) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const { start, end } = this.getDateRange(query);

    const sales = await this.prisma.sale.findMany({
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
      },
    });

    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const productId = item.productId;
        const existing = map.get(productId);

        if (existing) {
          existing.quantitySold += Number(item.quantity || 0);
          existing.revenue +=
            Number(item.price || 0) * Number(item.quantity || 0);
        } else {
          map.set(productId, {
            productId,
            name: item.product?.name || 'Produit',
            quantitySold: Number(item.quantity || 0),
            revenue: Number(item.price || 0) * Number(item.quantity || 0),
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  async getSalesByCashier(query: DashboardQuery) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const { start, end } = this.getDateRange(query);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        cashierId: {
          not: null,
        },
      },
      include: {
        cashier: true,
        payments: true,
      },
    });

    const grouped = new Map<
      string,
      {
        cashierId: string;
        cashierName: string;
        salesCount: number;
        totalSales: number;
        totalPayments: number;
      }
    >();

    for (const sale of sales) {
      if (!sale.cashierId) continue;

      const key = sale.cashierId;

      if (!grouped.has(key)) {
        grouped.set(key, {
          cashierId: sale.cashierId,
          cashierName:
            sale.cashier?.fullName ||
            sale.cashier?.login ||
            sale.cashier?.email ||
            'Caisse',
          salesCount: 0,
          totalSales: 0,
          totalPayments: 0,
        });
      }

      const row = grouped.get(key)!;

      row.salesCount += 1;
      row.totalSales += Number(sale.total || 0);
      row.totalPayments += sale.payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.totalPayments - a.totalPayments,
    );
  }

  async getSalesByCashierDaily(query: DashboardQuery) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const { start, end } = this.getDateRange(query);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        cashierId: {
          not: null,
        },
      },
      include: {
        cashier: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const grouped = new Map<
      string,
      {
        date: string;
        cashierId: string;
        cashierName: string;
        salesCount: number;
        totalSales: number;
        totalPayments: number;
        difference: number;
        missingAmount: number;
      }
    >();

    for (const sale of sales) {
      if (!sale.cashierId) continue;

      const saleDate = new Date(sale.createdAt).toISOString().slice(0, 10);
      const key = `${saleDate}_${sale.cashierId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: saleDate,
          cashierId: sale.cashierId,
          cashierName:
            sale.cashier?.fullName ||
            sale.cashier?.login ||
            sale.cashier?.email ||
            'Caisse',
          salesCount: 0,
          totalSales: 0,
          totalPayments: 0,
          difference: 0,
          missingAmount: 0,
        });
      }

      const row = grouped.get(key)!;

      row.salesCount += 1;
      row.totalSales += Number(sale.total || 0);
      row.totalPayments += sale.payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
    }

    const result = Array.from(grouped.values()).map((row) => {
      const difference = row.totalPayments - row.totalSales;
      const missingAmount = row.totalSales - row.totalPayments;

      return {
        ...row,
        difference,
        missingAmount,
      };
    });

    return result.sort((a, b) => {
      if (a.date === b.date) {
        return a.cashierName.localeCompare(b.cashierName);
      }
      return b.date.localeCompare(a.date);
    });
  }
}
