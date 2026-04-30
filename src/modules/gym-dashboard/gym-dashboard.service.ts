import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const payments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        sale: {
          tenantId,
        },
      },
    });

    const sessionPassRevenue = await this.prisma.gymSessionPass.aggregate({
      _sum: {
        price: true,
      },
      where: {
        tenantId,
        status: {
          in: ['active', 'used'],
        },
      },
    });

    const salesCount = await this.prisma.sale.count({
      where: {
        tenantId,
      },
    });

    const activeSubscriptions = await this.prisma.gymSubscription.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const expiredSubscriptions = await this.prisma.gymSubscription.count({
      where: {
        tenantId,
        isActive: true,
        endDate: {
          lt: new Date(),
        },
      },
    });

    const membersCount = await this.prisma.gymMember.count({
      where: {
        tenantId,
      },
    });

    const productsCount = await this.prisma.product.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const expenses = await this.prisma.gymExpense.aggregate({
      _sum: { amount: true },
      where: {
        tenantId,
      },
    });

    const productRevenue = Number(payments._sum.amount || 0);
    const sessionPassRevenueValue = Number(sessionPassRevenue._sum.price || 0);
    const expensesAmount = Number(expenses._sum.amount || 0);

    const revenue = productRevenue + sessionPassRevenueValue;

    return {
      revenue,
      subscriptionRevenue: 0,
      productRevenue,
      sessionPassRevenue: sessionPassRevenueValue,
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
      recentExpenses: [],

      alerts: {
        expiredSubscriptions,
        lowStockProductsCount: 0,
      },
    };
  }
}
