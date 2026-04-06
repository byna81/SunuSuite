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
      start.setHours(0, 0, 0, 0);

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

  private formatLocalDateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
      const key = sale.cashierId || `unassigned-${sale.tenantId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          cashierId: sale.cashierId || 'unassigned',
          cashierName:
            sale.cashier?.fullName ||
            sale.cashier?.login ||
            sale.cashier?.email ||
            'Caisse non affectée',
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
      },
      include: {
        cashier: true,
        payments: true,
      },
      orderBy: [{ createdAt: 'desc' }, { cashierId: 'asc' }],
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
      const saleDate = this.formatLocalDateKey(new Date(sale.createdAt));
      const cashierKey = sale.cashierId || 'unassigned';
      const key = `${saleDate}_${cashierKey}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: saleDate,
          cashierId: sale.cashierId || 'unassigned',
          cashierName:
            sale.cashier?.fullName ||
            sale.cashier?.login ||
            sale.cashier?.email ||
            'Caisse non affectée',
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

  async getProductInventory(query: DashboardQuery) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const { start, end } = this.getDateRange(query);

    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      },
    });

    const stockMovements = await this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const soldMap = new Map<string, number>();
    const addedMap = new Map<string, number>();

    for (const item of saleItems) {
      const current = soldMap.get(item.productId) || 0;
      soldMap.set(item.productId, current + Number(item.quantity || 0));
    }

    for (const movement of stockMovements) {
      const productId = movement.productId;
      const quantity = Number(movement.quantity || 0);

      if (
        movement.type === 'adjustment' ||
        movement.type === 'in' ||
        movement.type === 'inventory'
      ) {
        const current = addedMap.get(productId) || 0;
        addedMap.set(productId, current + quantity);
      }
    }

    return products.map((product) => {
      const soldQuantity = soldMap.get(product.id) || 0;
      const addedQuantity = addedMap.get(product.id) || 0;
      const remainingStock = Number(product.stock || 0);

      const stockInitial = remainingStock + soldQuantity - addedQuantity;

      return {
        productId: product.id,
        name: product.name,
        stockInitial,
        addedQuantity,
        soldQuantity,
        remainingStock,
        price: Number(product.price || 0),
      };
    });
  }
}
