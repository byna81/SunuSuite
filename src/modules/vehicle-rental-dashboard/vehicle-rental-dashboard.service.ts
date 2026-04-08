import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleRentalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string, period: string) {
    const now = new Date();

    let startDate: Date;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    }

    const [
      vehiclesAvailable,
      vehiclesRented,
      contractsActive,
      payments,
      contracts,
      maintenanceVehicles,
    ] = await Promise.all([
      this.prisma.vehicle.count({
        where: {
          tenantId,
          status: 'disponible',
          OR: [{ usageType: 'rental' }, { usageType: 'mixed' }],
        },
      }),

      this.prisma.vehicle.count({
        where: {
          tenantId,
          status: 'loue',
          OR: [{ usageType: 'rental' }, { usageType: 'mixed' }],
        },
      }),

      this.prisma.vehicleRentalContract.count({
        where: {
          tenantId,
          status: 'actif',
        },
      }),

      this.prisma.vehiclePayment.findMany({
        where: {
          tenantId,
          paymentType: 'rental',
          paidAt: { gte: startDate },
        },
      }),

      this.prisma.vehicleRentalContract.findMany({
        where: { tenantId },
        include: {
          vehicle: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.vehicle.count({
        where: {
          tenantId,
          status: 'maintenance',
          OR: [{ usageType: 'rental' }, { usageType: 'mixed' }],
        },
      }),
    ]);

    const collectedAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const remainingAmount = contracts.reduce(
      (sum, c) => sum + Number(c.remainingAmount || 0),
      0,
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const departuresToday = contracts.filter((c) => {
      const d = new Date(c.startDate);
      return d >= todayStart && d <= todayEnd;
    });

    const returnsToday = contracts.filter((c) => {
      if (!c.endDate) return false;
      const d = new Date(c.endDate);
      return d >= todayStart && d <= todayEnd;
    });

    const overdueContracts = contracts.filter((c) => {
      if (!c.endDate) return false;
      return c.status === 'actif' && new Date(c.endDate) < todayStart;
    });

    const latestPayments = await this.prisma.vehiclePayment.findMany({
      where: {
        tenantId,
        paymentType: 'rental',
      },
      include: {
        rentalContract: {
          include: {
            vehicle: true,
            customer: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
    });

    return {
      kpis: {
        availableVehicles: vehiclesAvailable,
        rentedVehicles: vehiclesRented,
        activeContracts: contractsActive,
        collectedAmount,
        remainingAmount,
        newContracts: contracts.filter(
          (c) => new Date(c.createdAt) >= startDate,
        ).length,
      },
      alerts: {
        departuresToday: departuresToday.length,
        returnsToday: returnsToday.length,
        overdueContracts: overdueContracts.length,
        maintenanceVehicles,
      },
      departuresToday,
      returnsToday,
      latestPayments,
    };
  }
}
