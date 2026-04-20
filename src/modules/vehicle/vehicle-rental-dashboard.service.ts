import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleRentalDashboardService {
  constructor(private prisma: PrismaService) {}

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
    ] = await Promise.all([
      // Véhicules disponibles à la location (CORRECTION : + usageType: 'rental')
      this.prisma.vehicle.count({
      where: {
        tenantId,
        status: 'disponible' as any,
        usageType: 'rental' as any,
      },
    }),
    
    this.prisma.vehicle.count({
      where: {
        tenantId,
        status: 'loue' as any,
        usageType: 'rental' as any,
      },
    }),

      this.prisma.vehicleRentalContract.count({
        where: { tenantId, status: 'actif' },
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

    const today = new Date().toDateString();

    const departuresToday = contracts.filter(
      (c) => new Date(c.startDate).toDateString() === today,
    );

    const returnsToday = contracts.filter(
      (c) =>
        c.endDate &&
        new Date(c.endDate).toDateString() === today,
    );

    const overdueContracts = contracts.filter(
      (c) =>
        c.status === 'actif' &&
        c.endDate &&
        new Date(c.endDate) < new Date(),
    );

    const latestPayments = await this.prisma.vehiclePayment.findMany({
      where: { tenantId, paymentType: 'rental' },
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
        maintenanceVehicles: 0,
      },
      departuresToday,
      returnsToday,
      latestPayments,
    };
  }
}
