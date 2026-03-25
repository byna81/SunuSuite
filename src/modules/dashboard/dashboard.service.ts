import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getRealEstateDashboard(tenantId: string) {
    const [
      properties,
      activeTenants,
      rents,
      ownerPayments,
      latestRents,
      latestOwnerPayments,
    ] = await Promise.all([
      this.prisma.property.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
        },
      }),

      this.prisma.tenantProperty.findMany({
        where: {
          status: 'actif',
          property: {
            tenantId,
          },
        },
        select: {
          id: true,
        },
      }),

      this.prisma.rentPayment.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          amountDue: true,
          amountPaid: true,
          remainingAmount: true,
          month: true,
          year: true,
          createdAt: true,
          property: {
            select: {
              title: true,
            },
          },
          tenantProperty: {
            select: {
              name: true,
            },
          },
        },
      }),

      this.prisma.ownerPayment.findMany({
        where: { tenantId },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          owner: {
            select: {
              name: true,
            },
          },
          property: {
            select: {
              title: true,
            },
          },
          periodLabel: true,
        },
      }),

      this.prisma.rentPayment.findMany({
        where: { tenantId },
        include: {
          property: {
            select: {
              title: true,
            },
          },
          tenantProperty: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 5,
      }),

      this.prisma.ownerPayment.findMany({
        where: { tenantId },
        include: {
          owner: {
            select: {
              name: true,
            },
          },
          property: {
            select: {
              title: true,
            },
          },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
    ]);

    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(
      (item) => item.status === 'occupé',
    ).length;
    const availableProperties = properties.filter(
      (item) => item.status === 'disponible',
    ).length;

    const occupancyRate =
      totalProperties > 0
        ? Math.round((occupiedProperties / totalProperties) * 100)
        : 0;

    const totalRentDue = rents.reduce(
      (sum, item) => sum + Number(item.amountDue || 0),
      0,
    );

    const totalRentPaid = rents.reduce(
      (sum, item) => sum + Number(item.amountPaid || 0),
      0,
    );

    const totalRentRemaining = rents.reduce(
      (sum, item) => sum + Number(item.remainingAmount || 0),
      0,
    );

    const paidRentsCount = rents.filter((item) => item.status === 'paye').length;
    const partialRentsCount = rents.filter(
      (item) => item.status === 'partiel',
    ).length;
    const lateRentsCount = rents.filter(
      (item) => item.status === 'en_retard',
    ).length;
    const unpaidRentsCount = rents.filter(
      (item) => item.status === 'a_payer',
    ).length;

    const totalOwnerPayments = ownerPayments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const agencyMarginEstimate = totalRentPaid - totalOwnerPayments;

    return {
      summary: {
        totalProperties,
        occupiedProperties,
        availableProperties,
        activeTenants: activeTenants.length,
        occupancyRate,
      },

      rents: {
        totalRentDue,
        totalRentPaid,
        totalRentRemaining,
        paidRentsCount,
        partialRentsCount,
        lateRentsCount,
        unpaidRentsCount,
      },

      ownerPayments: {
        totalOwnerPayments,
      },

      finance: {
        agencyMarginEstimate,
      },

      latestRents,
      latestOwnerPayments,
    };
  }
}
