import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleRentalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string, period: string) {
    const now = new Date();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let startDate: Date;

    if (period === 'week') {
      startDate = new Date(todayStart);
      startDate.setDate(startDate.getDate() - 6);
    } else if (period === 'month') {
      startDate = new Date(todayStart);
      startDate.setDate(1);
    } else {
      startDate = new Date(todayStart);
    }

    const [
      vehiclesAvailable,
      vehiclesRented,
      contracts,
      payments,
      maintenanceVehicles,
      latestPayments,
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

      this.prisma.vehicleRentalContract.findMany({
        where: { tenantId },
        include: {
          vehicle: true,
          customer: true,
          payments: {
            orderBy: { paidAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.vehiclePayment.findMany({
        where: {
          tenantId,
          paymentType: 'rental',
          paidAt: { gte: startDate, lte: todayEnd },
        },
      }),

      this.prisma.vehicle.count({
        where: {
          tenantId,
          status: 'maintenance',
          OR: [{ usageType: 'rental' }, { usageType: 'mixed' }],
        },
      }),

      this.prisma.vehiclePayment.findMany({
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

    // Contrats actifs métier :
    // - déjà commencés
    // - pas encore finis
    // - non annulés / non terminés
    const activeContractsList = contracts.filter((c) => {
      const contractStart = new Date(c.startDate);
      const contractEnd = c.endDate ? new Date(c.endDate) : null;

      const started = contractStart <= todayEnd;
      const notFinished = !contractEnd || contractEnd >= todayStart;
      const notClosed = c.status !== 'annule' && c.status !== 'termine';

      return started && notFinished && notClosed;
    });

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
      const end = new Date(c.endDate);

      return (
        c.status !== 'annule' &&
        c.status !== 'termine' &&
        end < todayStart
      );
    });

    const newContracts = contracts.filter((c) => {
      const createdAt = new Date(c.createdAt);
      return createdAt >= startDate && createdAt <= todayEnd;
    });

    return {
      kpis: {
        availableVehicles: vehiclesAvailable,
        rentedVehicles: vehiclesRented,
        activeContracts: activeContractsList.length,
        collectedAmount,
        remainingAmount,
        newContracts: newContracts.length,
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
