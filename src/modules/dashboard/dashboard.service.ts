import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private monthKey(month: number, year: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  async getRealEstateDashboard(tenantId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      properties,
      activeTenants,
      rents,
      ownerPayments,
      contracts,
      latestRents,
      latestOwnerPayments,
    ] = await Promise.all([
      this.prisma.property.findMany({
        where: { tenantId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      this.prisma.tenantProperty.findMany({
        where: {
          status: 'actif',
          property: {
            tenantId,
          },
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              ownerId: true,
            },
          },
        },
      }),

      this.prisma.rentPayment.findMany({
        where: {
          property: {
            tenantId,
          },
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
            },
          },
          tenantProperty: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      }),

      this.prisma.ownerPayment.findMany({
        where: {
          property: {
            tenantId,
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      }),

      this.prisma.leaseContract.findMany({
        where: {
          tenantId,
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              ownerId: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          tenantProperty: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),

      this.prisma.rentPayment.findMany({
        where: {
          property: {
            tenantId,
          },
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
            },
          },
          tenantProperty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),

      this.prisma.ownerPayment.findMany({
        where: {
          property: {
            tenantId,
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        take: 8,
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

    const totalOwnerPaymentsDone = ownerPayments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const agencyMarginEstimate = totalRentPaid - totalOwnerPaymentsDone;

    const currentMonthRents = rents.filter(
      (item) => item.month === currentMonth && item.year === currentYear,
    );

    const currentMonthRentExpected = currentMonthRents.reduce(
      (sum, item) => sum + Number(item.amountDue || 0),
      0,
    );

    const currentMonthRentCollected = currentMonthRents.reduce(
      (sum, item) => sum + Number(item.amountPaid || 0),
      0,
    );

    const currentMonthRentRemaining = currentMonthRents.reduce(
      (sum, item) => sum + Number(item.remainingAmount || 0),
      0,
    );

    const unpaidByTenant = new Map<
      string,
      {
        tenantName: string;
        tenantPhone: string | null;
        propertyTitle: string;
        unpaidMonths: number;
        totalRemaining: number;
      }
    >();

    rents.forEach((item) => {
      const isUnpaid =
        item.status === 'a_payer' ||
        item.status === 'en_retard' ||
        (Number(item.remainingAmount || 0) > 0 &&
          item.year <= currentYear &&
          item.month <= 12);

      if (!isUnpaid || !item.tenantProperty) return;

      const key = item.tenantProperty.id;
      const current = unpaidByTenant.get(key);

      if (!current) {
        unpaidByTenant.set(key, {
          tenantName: item.tenantProperty.name,
          tenantPhone: item.tenantProperty.phone || null,
          propertyTitle: item.property?.title || '-',
          unpaidMonths: 1,
          totalRemaining: Number(item.remainingAmount || 0),
        });
      } else {
        current.unpaidMonths += 1;
        current.totalRemaining += Number(item.remainingAmount || 0);
      }
    });

    const criticalTenants = Array.from(unpaidByTenant.values())
      .filter((item) => item.unpaidMonths >= 2)
      .sort((a, b) => b.unpaidMonths - a.unpaidMonths);

    const overdueTenants = rents
      .filter(
        (item) =>
          item.status === 'en_retard' ||
          (item.status === 'a_payer' && Number(item.remainingAmount || 0) > 0),
      )
      .map((item) => ({
        id: item.id,
        tenantName: item.tenantProperty?.name || '-',
        tenantPhone: item.tenantProperty?.phone || null,
        propertyTitle: item.property?.title || '-',
        month: item.month,
        year: item.year,
        amountDue: Number(item.amountDue || 0),
        amountPaid: Number(item.amountPaid || 0),
        remainingAmount: Number(item.remainingAmount || 0),
        status: item.status,
      }))
      .sort((a, b) => b.remainingAmount - a.remainingAmount);

    const activeContracts = contracts.filter(
      (item) => item.status === 'actif' || item.status === 'en_cours',
    );

    const ownerContracts = activeContracts.filter((item) => item.property?.ownerId);

    const pendingOwnerPayments = ownerContracts
      .map((contract) => {
        const contractRent = Number(contract.rentAmount || 0);
        const agencyPercent = Number((contract as any).agencyPercent || 0);
        const ownerAmount = Number(
          (contractRent - (contractRent * agencyPercent) / 100).toFixed(2),
        );

        const periodLabel = new Date(
          currentYear,
          currentMonth - 1,
          1,
        ).toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        });

        const alreadyPaidForCurrentPeriod = ownerPayments
          .filter(
            (payment) =>
              payment.property?.id === contract.property?.id &&
              payment.owner?.id === contract.property?.owner?.id &&
              (payment.periodLabel || '').toLowerCase() ===
                periodLabel.toLowerCase(),
          )
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const remainingToPay = Number(
          Math.max(ownerAmount - alreadyPaidForCurrentPeriod, 0).toFixed(2),
        );

        return {
          contractId: contract.id,
          propertyId: contract.property?.id || '',
          propertyTitle: contract.property?.title || '-',
          ownerId: contract.property?.owner?.id || '',
          ownerName: contract.property?.owner?.name || '-',
          tenantName: contract.tenantProperty?.name || '-',
          periodLabel,
          ownerAmount,
          alreadyPaid: alreadyPaidForCurrentPeriod,
          remainingToPay,
        };
      })
      .filter((item) => item.remainingToPay > 0)
      .sort((a, b) => b.remainingToPay - a.remainingToPay);

    const totalOwnerPaymentsRemaining = pendingOwnerPayments.reduce(
      (sum, item) => sum + item.remainingToPay,
      0,
    );

    const contractsExpiringSoon = contracts
      .filter((item) => {
        if (!item.endDate) return false;
        const end = new Date(item.endDate);
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
      })
      .map((item) => ({
        id: item.id,
        propertyTitle: item.property?.title || '-',
        tenantName: item.tenantProperty?.name || '-',
        endDate: item.endDate,
      }))
      .sort(
        (a, b) =>
          new Date(a.endDate || '').getTime() - new Date(b.endDate || '').getTime(),
      );

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
        currentMonthRentExpected,
        currentMonthRentCollected,
        currentMonthRentRemaining,
        paidRentsCount,
        partialRentsCount,
        lateRentsCount,
        unpaidRentsCount,
      },

      ownerPayments: {
        totalOwnerPaymentsDone,
        totalOwnerPaymentsRemaining,
        pendingCount: pendingOwnerPayments.length,
      },

      finance: {
        agencyMarginEstimate,
      },

      alerts: {
        overdueTenants,
        criticalTenants,
        contractsExpiringSoon,
        pendingOwnerPayments,
      },

      latestRents,
      latestOwnerPayments,
    };
  }

  async getYangoDashboard(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [
      vehicles,
      drivers,
      contracts,
      driverPayments,
      ownerSettlements,
      maintenances,
      expenses,
    ] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          tenantId,
          usageType: 'mixed',
        },
      }),

      this.prisma.vtcDriver.findMany({
        where: {
          tenantId,
        },
      }),

      this.prisma.vtcContract.findMany({
        where: {
          tenantId,
        },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
            },
          },
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.vtcDriverPayment.findMany({
        where: {
          tenantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.vtcOwnerSettlement.findMany({
        where: {
          tenantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.vehicleMaintenance.findMany({
        where: {
          tenantId,
          vehicle: {
            usageType: 'mixed',
          },
        },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
            },
          },
        },
        orderBy: {
          scheduledDate: 'asc',
        },
      }),

      this.prisma.expense.findMany({
        where: {
          tenantId,
          module: 'yango',
        },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
            },
          },
        },
        orderBy: {
          expenseDate: 'desc',
        },
      }),
    ]);

    const activeDrivers = drivers.filter(
      (item: any) =>
        item.status === 'actif' ||
        item.status === 'active' ||
        item.status === 'disponible' ||
        !item.status,
    );

    const getPaymentDate = (item: any) => {
      return new Date(item.paymentDate || item.paidAt || item.createdAt);
    };

    const todayPayments = driverPayments.filter((item: any) => {
      const date = getPaymentDate(item);
      return date >= startOfToday && date <= endOfToday;
    });

    const weekPayments = driverPayments.filter((item: any) => {
      const date = getPaymentDate(item);
      return date >= startOfWeek && date <= endOfWeek;
    });

    const monthPayments = driverPayments.filter((item: any) => {
      const date = getPaymentDate(item);
      return date >= startOfMonth && date <= endOfMonth;
    });

    const revenueToday = todayPayments.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0,
    );

    const revenueWeek = weekPayments.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0,
    );

    const revenueMonth = monthPayments.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0,
    );

    const totalDriverPayments = driverPayments.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0,
    );

    const totalExpenses = expenses.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0,
    );

    const totalOwnerSettlementsPaid = ownerSettlements.reduce(
      (sum: number, item: any) => sum + Number(item.alreadyPaid || 0),
      0,
    );

    const totalOwnerSettlementsRemaining = ownerSettlements.reduce(
      (sum: number, item: any) => sum + Number(item.remainingToPay || 0),
      0,
    );

    const netResult =
      totalDriverPayments - totalExpenses - totalOwnerSettlementsPaid;

    const latePayments = contracts
      .map((contract: any) => {
        const expectedAmount =
          contract.contractType === 'journee' ||
          contract.contractType === 'versement_journalier'
            ? Number(contract.dailyTarget || contract.fixedRentAmount || 0)
            : contract.contractType === 'semaine'
              ? Number(contract.weeklyTarget || contract.fixedRentAmount || 0)
              : Number(contract.monthlyTarget || contract.fixedRentAmount || 0);

        if (expectedAmount <= 0) {
          return null;
        }

        const relatedPayments = driverPayments.filter((payment: any) => {
          return (
            payment.contractId === contract.id ||
            payment.vtcContractId === contract.id
          );
        });

        const paidAmount = relatedPayments.reduce(
          (sum: number, item: any) => sum + Number(item.amount || 0),
          0,
        );

        const remainingAmount = Math.max(expectedAmount - paidAmount, 0);

        if (remainingAmount <= 0) {
          return null;
        }

        return {
          contractId: contract.id,
          driverName: contract.driver?.fullName || '-',
          driverPhone: contract.driver?.phone || null,
          vehicleLabel: `${contract.vehicle?.brand || ''} ${contract.vehicle?.model || ''}`.trim(),
          expectedAmount,
          paidAmount,
          remainingAmount,
          contractType: contract.contractType,
          startDate: contract.startDate,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.remainingAmount - a.remainingAmount);

    const totalLatePaymentsAmount = latePayments.reduce(
      (sum: number, item: any) => sum + Number(item.remainingAmount || 0),
      0,
    );

    const upcomingMaintenances = maintenances.filter((item: any) => {
      if (!item.scheduledDate) return false;
      const date = new Date(item.scheduledDate);
      return date >= startOfToday;
    });

    const overdueMaintenances = maintenances.filter((item: any) => {
      if (!item.scheduledDate) return false;
      const date = new Date(item.scheduledDate);
      return date < startOfToday && item.status !== 'completed';
    });

    const insuranceExpiringSoon = vehicles
      .filter((item: any) => {
        if (!item.insuranceExpiry) return false;
        const date = new Date(item.insuranceExpiry);
        return date >= startOfToday && date <= endOfMonth;
      })
      .map((item: any) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        insuranceExpiry: item.insuranceExpiry,
      }));

    const technicalVisitsExpiringSoon = vehicles
      .filter((item: any) => {
        if (!item.technicalVisitExpiry) return false;
        const date = new Date(item.technicalVisitExpiry);
        return date >= startOfToday && date <= endOfMonth;
      })
      .map((item: any) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        technicalVisitExpiry: item.technicalVisitExpiry,
      }));

    const latestDriverPayments = driverPayments.slice(0, 8);
    const latestExpenses = expenses.slice(0, 8);
    const latestMaintenances = maintenances.slice(0, 8);

    return {
      summary: {
        totalVehicles: vehicles.length,
        activeDrivers: activeDrivers.length,
        totalContracts: contracts.length,
      },

      revenues: {
        revenueToday,
        revenueWeek,
        revenueMonth,
        totalDriverPayments,
      },

      expenses: {
        totalExpenses,
        count: expenses.length,
      },

      ownerSettlements: {
        totalOwnerSettlementsPaid,
        totalOwnerSettlementsRemaining,
        count: ownerSettlements.length,
      },

      finance: {
        netResult,
        totalLatePaymentsAmount,
      },

      alerts: {
        latePayments,
        upcomingMaintenances,
        overdueMaintenances,
        insuranceExpiringSoon,
        technicalVisitsExpiringSoon,
      },

      latestDriverPayments,
      latestExpenses,
      latestMaintenances,
    };
  }
}
