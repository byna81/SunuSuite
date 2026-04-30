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

  async getDashboard(tenantId: string, period: Period = 'today') {
    const { start, end } = this.getPeriodRange(period);

    /*
      Produits vendus :
      Le modèle Payment n'a pas tenantId directement dans ton schéma.
      On filtre donc par la relation sale.tenantId + sale.createdAt.
    */
    const productPayments = await this.prisma.payment.aggregate({
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

    const salesCount = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    /*
      Paiements abonnements :
      Ton service gym-payments crée les paiements dans gymPayment avec un champ reason.
      Exemple visible côté front : "Abonnement mensuel avril 2026".
      Donc on classe en abonnement tous les gymPayment dont reason contient "abonnement".
    */
    const subscriptionPayments = await this.prisma.gymPayment.aggregate({
      _sum: { amount: true },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        reason: {
          contains: 'abonnement',
          mode: 'insensitive',
        },
      },
    });

    const paymentsByMethodRaw = await this.prisma.gymPayment.groupBy({
      by: ['method'],
      _sum: {
        amount: true,
      },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        reason: {
          contains: 'abonnement',
          mode: 'insensitive',
        },
      },
    });

    /*
      Passes séance :
      Montant vendu via les passes journée.
    */
    const sessionPasses = await this.prisma.gymSessionPass.aggregate({
      _sum: { price: true },
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const sessionPassesCount = await this.prisma.gymSessionPass.count({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
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
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const recentExpenses = await this.prisma.gymExpense.findMany({
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

    const productRevenue = Number(productPayments._sum.amount || 0);
    const subscriptionRevenue = Number(subscriptionPayments._sum.amount || 0);
    const sessionPassRevenue = Number(sessionPasses._sum.price || 0);
    const expensesAmount = Number(expenses._sum.amount || 0);

    const revenue = productRevenue + subscriptionRevenue + sessionPassRevenue;

    const paymentsByMethod = paymentsByMethodRaw.map((item) => ({
      method: item.method || 'Non renseigné',
      amount: Number(item._sum.amount || 0),
    }));

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

      paymentsByMethod,
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
