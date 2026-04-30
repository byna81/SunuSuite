import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Period = 'today' | 'week' | 'month';

@Injectable()
export class GymDashboardService {
  constructor(private prisma: PrismaService) {}

  private getPeriodRange(period: Period = 'today') {
    const now = new Date();

    const start = new Date(now);
    const end = new Date(now);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (period === 'week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;

      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);

      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  private async safeAggregate(modelName: string, args: any) {
    const model = (this.prisma as any)?.[modelName];
    if (!model?.aggregate) return null;

    try {
      return await model.aggregate(args);
    } catch (e: any) {
      console.log(`[GymDashboard] aggregate ${modelName} ignoré`, e?.message || e);
      return null;
    }
  }

  private async safeCount(modelName: string, args: any) {
    const model = (this.prisma as any)?.[modelName];
    if (!model?.count) return 0;

    try {
      return await model.count(args);
    } catch (e: any) {
      console.log(`[GymDashboard] count ${modelName} ignoré`, e?.message || e);
      return 0;
    }
  }

  private async safeFindMany(modelName: string, args: any) {
    const model = (this.prisma as any)?.[modelName];
    if (!model?.findMany) return [];

    try {
      return await model.findMany(args);
    } catch (e: any) {
      console.log(`[GymDashboard] findMany ${modelName} ignoré`, e?.message || e);
      return [];
    }
  }

  async getDashboard(tenantId: string, period: Period = 'today') {
    const { start, end } = this.getPeriodRange(period);

    const productPayments = await this.safeAggregate('payment', {
      _sum: { amount: true },
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

    const salesCount = await this.safeCount('sale', {
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const gymSubscriptionPayments = await this.safeAggregate('gymSubscriptionPayment', {
      _sum: { amount: true },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const subscriptionPayments = await this.safeAggregate('subscriptionPayment', {
      _sum: { amount: true },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const gymPayments = await this.safeAggregate('gymPayment', {
      _sum: { amount: true },
      where: {
        tenantId,
        type: {
          in: ['subscription', 'abonnement'],
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const sessionPasses = await this.safeAggregate('gymSessionPass', {
      _sum: { price: true },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const sessionPassesCount = await this.safeCount('gymSessionPass', {
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const activeSubscriptions = await this.safeCount('gymSubscription', {
      where: {
        tenantId,
        isActive: true,
      },
    });

    const expiredSubscriptions = await this.safeCount('gymSubscription', {
      where: {
        tenantId,
        isActive: true,
        endDate: {
          lt: new Date(),
        },
      },
    });

    const membersCount = await this.safeCount('gymMember', {
      where: {
        tenantId,
      },
    });

    const productsCount = await this.safeCount('product', {
      where: {
        tenantId,
        isActive: true,
      },
    });

    const expenses = await this.safeAggregate('gymExpense', {
      _sum: { amount: true },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const recentExpenses = await this.safeFindMany('gymExpense', {
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const productRevenue = Number(productPayments?._sum?.amount || 0);
    const subscriptionRevenue =
      Number(gymSubscriptionPayments?._sum?.amount || 0) +
      Number(subscriptionPayments?._sum?.amount || 0) +
      Number(gymPayments?._sum?.amount || 0);

    const sessionPassRevenue = Number(sessionPasses?._sum?.price || 0);
    const expensesAmount = Number(expenses?._sum?.amount || 0);

    const revenue = productRevenue + subscriptionRevenue + sessionPassRevenue;

    return {
      period,
      startDate: start,
      endDate: end,

      revenue,
      subscriptionRevenue,
      productRevenue,
      sessionPassRevenue,
      sessionPassesCount,

      expenses: expensesAmount,
      profit: revenue - expensesAmount,

      salesCount,
      activeSubscriptions,
      expiredSubscriptions,
      membersCount,
      productsCount,

      paymentsByMethod: [],
      lowStockProducts: [],
      recentSubscriptions: [],
      recentExpenses,

      alerts: {
        expiredSubscriptions,
        lowStockProductsCount: 0,
      },
    };
  }
}
