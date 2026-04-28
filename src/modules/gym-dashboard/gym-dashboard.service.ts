import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GymDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const revenue = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { tenantId },
    });

    const salesCount = await this.prisma.payment.count({
      where: { tenantId },
    });

    const subscriptions = await this.prisma.gymSubscription.count({
      where: { tenantId, isActive: true },
    });

    const products = await this.prisma.product.count({
      where: { tenantId, isActive: true },
    });

    return {
      revenue: revenue._sum.amount || 0,
      salesCount,
      subscriptions,
      products,
    };
  }
}
