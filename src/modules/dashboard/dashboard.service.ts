import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private toNumber(value: any) {
    return Number(value || 0);
  }

  private formatAmount(value: any) {
    return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
  }

  private formatDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR');
  }

  private getLabel(key: string) {
    const labels: Record<string, string> = {
      revenue: 'Revenus',
      expenses: 'Dépenses',
      netResult: 'Résultat net',
      outstanding: 'Reste à encaisser',
      latePayments: 'Versements en retard',
    };

    return labels[key] || key;
  }

  // ================================
  // DASHBOARD GLOBAL
  // ================================
  async getAccountingDashboard(tenantId: string) {
    const [sale, rental, yango] = await Promise.all([
      this.getSaleDashboard(tenantId),
      this.getRentalDashboard(tenantId),
      this.getYangoDashboard(tenantId),
    ]);

    const globalRevenue =
      this.toNumber(sale?.revenues?.totalSalesRevenue) +
      this.toNumber(rental?.revenues?.totalRentalRevenue) +
      this.toNumber(yango?.revenues?.totalDriverPayments);

    const globalExpenses =
      this.toNumber(sale?.expenses?.totalExpenses) +
      this.toNumber(rental?.expenses?.totalExpenses) +
      this.toNumber(yango?.expenses?.totalExpenses);

    const globalNet =
      this.toNumber(sale?.finance?.netResult) +
      this.toNumber(rental?.finance?.netResult) +
      this.toNumber(yango?.finance?.netResult);

    const globalOutstanding =
      this.toNumber(sale?.finance?.totalOutstandingSales) +
      this.toNumber(rental?.finance?.totalOutstandingRentals) +
      this.toNumber(yango?.finance?.totalLatePaymentsAmount);

    return {
      sale: {
        revenue: this.toNumber(sale?.revenues?.totalSalesRevenue),
        expenses: this.toNumber(sale?.expenses?.totalExpenses),
        netResult: this.toNumber(sale?.finance?.netResult),
        outstanding: this.toNumber(sale?.finance?.totalOutstandingSales),
      },
      rental: {
        revenue: this.toNumber(rental?.revenues?.totalRentalRevenue),
        expenses: this.toNumber(rental?.expenses?.totalExpenses),
        netResult: this.toNumber(rental?.finance?.netResult),
        outstanding: this.toNumber(rental?.finance?.totalOutstandingRentals),
      },
      yango: {
        revenue: this.toNumber(yango?.revenues?.totalDriverPayments),
        expenses: this.toNumber(yango?.expenses?.totalExpenses),
        netResult: this.toNumber(yango?.finance?.netResult),
        latePayments: this.toNumber(yango?.finance?.totalLatePaymentsAmount),
      },
      global: {
        revenue: globalRevenue,
        expenses: globalExpenses,
        netResult: globalNet,
        outstanding: globalOutstanding,
      },
    };
  }

  async getRealEstateDashboard(tenantId: string) {
    return {
      summary: {
        totalProperties: 0,
        occupiedProperties: 0,
        availableProperties: 0,
        activeTenants: 0,
        occupancyRate: 0,
      },
      rents: {
        totalRentDue: 0,
        totalRentPaid: 0,
        totalRentRemaining: 0,
        currentMonthRentExpected: 0,
        currentMonthRentCollected: 0,
        currentMonthRentRemaining: 0,
        paidRentsCount: 0,
        partialRentsCount: 0,
        lateRentsCount: 0,
        unpaidRentsCount: 0,
      },
      ownerPayments: {
        totalOwnerPaymentsDone: 0,
        totalOwnerPaymentsRemaining: 0,
        pendingCount: 0,
      },
      finance: {
        agencyMarginEstimate: 0,
      },
      alerts: {
        overdueTenants: [],
        criticalTenants: [],
        contractsExpiringSoon: [],
        pendingOwnerPayments: [],
      },
      latestRents: [],
      latestOwnerPayments: [],
    };
  }

  // ================================
  // EXPORT PDF
  // ================================
  async exportAccountingPdf(tenantId: string) {
    const PDFDocument = require('pdfkit');
    const accounting = await this.getAccountingDashboard(tenantId);

    return await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (c: Buffer) => chunks.push(c));

      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);

        resolve({
          fileName: 'comptabilite-transport.pdf',
          mimeType: 'application/pdf',
          base64: buffer.toString('base64'),
        });
      });

      doc.on('error', reject);

      doc.fontSize(22).text('Comptabilité transport', { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .fillColor('#666')
        .text(`Date : ${this.formatDate()}`, { align: 'center' });

      doc.moveDown(1.2);
      doc.fillColor('#000');

      const add = (title: string, data: any) => {
        doc.fontSize(16).fillColor('#000').text(title);
        doc.moveDown(0.5);

        Object.entries(data).forEach(([k, v]) => {
          const label = this.getLabel(k);

          doc
            .fontSize(11)
            .fillColor('#444')
            .text(`${label} : `, { continued: true })
            .fillColor('#000')
            .text(this.formatAmount(v));
        });

        doc.moveDown();
      };

      add('Global société', accounting.global);
      add('Vente', accounting.sale);
      add('Location', accounting.rental);
      add('Yango', accounting.yango);

      doc.end();
    });
  }

  // ================================
  // EXPORT EXCEL
  // ================================
  async exportAccountingExcel(tenantId: string) {
    const ExcelJS = require('exceljs');
    const accounting = await this.getAccountingDashboard(tenantId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Comptabilité transport');

    sheet.columns = [
      { header: 'Section', key: 'section', width: 25 },
      { header: 'Type', key: 'type', width: 30 },
      { header: 'Montant', key: 'amount', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const push = (section: string, obj: any) => {
      Object.entries(obj).forEach(([k, v]) => {
        sheet.addRow({
          section,
          type: this.getLabel(k),
          amount: v,
        });
      });
    };

    push('Global société', accounting.global);
    push('Vente', accounting.sale);
    push('Location', accounting.rental);
    push('Yango', accounting.yango);

    sheet.eachRow((row: any, rowNumber: number) => {
      row.alignment = { vertical: 'middle' };

      if (rowNumber > 1) {
        row.getCell(3).numFmt = '#,##0';
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      fileName: 'comptabilite-transport.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: Buffer.from(buffer).toString('base64'),
    };
  }

  // ================================
  // MOCK SIMPLE (à remplacer plus tard par tes vraies méthodes)
  // ================================
  async getSaleDashboard(tenantId: string) {
    return {
      revenues: { totalSalesRevenue: 0 },
      expenses: { totalExpenses: 0 },
      finance: { netResult: 0, totalOutstandingSales: 0 },
    };
  }

  async getRentalDashboard(tenantId: string) {
    return {
      revenues: { totalRentalRevenue: 0 },
      expenses: { totalExpenses: 0 },
      finance: { netResult: 0, totalOutstandingRentals: 0 },
    };
  }

  async getYangoDashboard(tenantId: string) {
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalVehicles,
    totalContracts,
    activeDrivers,
    activeAssignments,
    availableVehicles,
    driverPaymentsTodayAgg,
    driverPaymentsWeekAgg,
    driverPaymentsMonthAgg,
    totalDriverPaymentsAgg,
    latestDriverPayments,
    yangoExpensesAgg,
    latestExpenses,
    ownerSettlementsPaidAgg,
    ownerSettlementsRemainingAgg,
    ownerSettlementsCount,
    latePayments,
    upcomingMaintenances,
    overdueMaintenances,
    insuranceExpiringSoon,
    technicalVisitsExpiringSoon,
  ] = await Promise.all([
    this.prisma.vehicle.count({
      where: {
        tenantId,
        usageType: { in: ['mixed', 'vtc'] },
      },
    }),

    this.prisma.vtcContract.count({
      where: {
        tenantId,
      },
    }),

    this.prisma.vehicleAssignment.count({
      where: {
        tenantId,
        isActive: true,
        driver: {
          status: 'actif',
        },
      },
    }),

    this.prisma.vehicleAssignment.count({
      where: {
        tenantId,
        isActive: true,
      },
    }),

    this.prisma.vehicle.count({
      where: {
        tenantId,
        usageType: { in: ['mixed', 'vtc'] },
        status: 'disponible',
      },
    }),

    this.prisma.vtcDriverPayment.aggregate({
      where: {
        tenantId,
        paymentDate: {
          gte: startOfToday,
          lt: endOfToday,
        },
        paidAmount: {
          gt: 0,
        },
      },
      _sum: {
        paidAmount: true,
      },
    }),

    this.prisma.vtcDriverPayment.aggregate({
      where: {
        tenantId,
        paymentDate: {
          gte: startOfWeek,
          lt: endOfWeek,
        },
        paidAmount: {
          gt: 0,
        },
      },
      _sum: {
        paidAmount: true,
      },
    }),

    this.prisma.vtcDriverPayment.aggregate({
      where: {
        tenantId,
        paymentDate: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
        paidAmount: {
          gt: 0,
        },
      },
      _sum: {
        paidAmount: true,
      },
    }),

    this.prisma.vtcDriverPayment.aggregate({
      where: {
        tenantId,
        paidAmount: {
          gt: 0,
        },
      },
      _sum: {
        paidAmount: true,
      },
    }),

    this.prisma.vtcDriverPayment.findMany({
      where: {
        tenantId,
      },
      include: {
        driver: true,
        vehicle: true,
        contract: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),

    this.prisma.expense.aggregate({
      where: {
        tenantId,
        module: 'yango',
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),

    this.prisma.expense.findMany({
      where: {
        tenantId,
        module: 'yango',
      },
      include: {
        vehicle: true,
      },
      orderBy: {
        expenseDate: 'desc',
      },
      take: 10,
    }),

    this.prisma.vtcOwnerSettlement.aggregate({
      where: {
        tenantId,
      },
      _sum: {
        alreadyPaid: true,
      },
    }),

    this.prisma.vtcOwnerSettlement.aggregate({
      where: {
        tenantId,
      },
      _sum: {
        remainingToPay: true,
      },
    }),

    this.prisma.vtcOwnerSettlement.count({
      where: {
        tenantId,
      },
    }),

    this.prisma.vtcDriverPayment.findMany({
      where: {
        tenantId,
        status: 'late',
      },
      include: {
        driver: true,
        vehicle: true,
        contract: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    }),

    this.prisma.vehicleMaintenance.findMany({
      where: {
        tenantId,
        vehicle: {
          usageType: { in: ['mixed', 'vtc'] },
        },
        OR: [
          {
            status: {
              in: ['pending', 'scheduled'],
            },
          },
          {
            scheduledDate: {
              gte: startOfToday,
            },
          },
          {
            nextDueDate: {
              gte: startOfToday,
            },
          },
        ],
      },
      include: {
        vehicle: true,
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { nextDueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    }),

    this.prisma.vehicleMaintenance.findMany({
      where: {
        tenantId,
        vehicle: {
          usageType: { in: ['mixed', 'vtc'] },
        },
        OR: [
          {
            status: 'overdue',
          },
          {
            scheduledDate: {
              lt: startOfToday,
            },
            status: {
              in: ['pending', 'scheduled'],
            },
          },
          {
            nextDueDate: {
              lt: startOfToday,
            },
            status: {
              in: ['pending', 'scheduled'],
            },
          },
        ],
      },
      include: {
        vehicle: true,
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { nextDueDate: 'asc' },
      ],
      take: 20,
    }),

    this.prisma.vehicle.findMany({
      where: {
        tenantId,
        usageType: { in: ['mixed', 'vtc'] },
        insuranceExpiry: {
          gte: startOfToday,
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 31),
        },
      },
      orderBy: {
        insuranceExpiry: 'asc',
      },
      take: 20,
    }),

    this.prisma.vehicle.findMany({
      where: {
        tenantId,
        usageType: { in: ['mixed', 'vtc'] },
        technicalVisitExpiry: {
          gte: startOfToday,
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 31),
        },
      },
      orderBy: {
        technicalVisitExpiry: 'asc',
      },
      take: 20,
    }),
  ]);

  const revenueToday = this.toNumber(driverPaymentsTodayAgg._sum.paidAmount);
  const revenueWeek = this.toNumber(driverPaymentsWeekAgg._sum.paidAmount);
  const revenueMonth = this.toNumber(driverPaymentsMonthAgg._sum.paidAmount);
  const totalDriverPayments = this.toNumber(totalDriverPaymentsAgg._sum.paidAmount);

  const totalExpenses = this.toNumber(yangoExpensesAgg._sum.amount);
  const expensesCount = this.toNumber(yangoExpensesAgg._count.id);

  const totalOwnerSettlementsPaid = this.toNumber(
    ownerSettlementsPaidAgg._sum.alreadyPaid,
  );
  const totalOwnerSettlementsRemaining = this.toNumber(
    ownerSettlementsRemainingAgg._sum.remainingToPay,
  );

  const totalLatePaymentsAmount = latePayments.reduce(
    (sum, item) => sum + this.toNumber(item.remainingAmount),
    0,
  );

  const netResult =
    totalDriverPayments - totalExpenses - totalOwnerSettlementsPaid;

  return {
    summary: {
      totalVehicles,
      vehiclesAssigned: activeAssignments,
      vehiclesAvailable: availableVehicles,
      activeDrivers,
      totalContracts,
    },

    revenues: {
      revenueToday,
      revenueWeek,
      revenueMonth,
      totalDriverPayments,
    },

    expenses: {
      totalExpenses,
      count: expensesCount,
    },

    ownerSettlements: {
      totalOwnerSettlementsPaid,
      totalOwnerSettlementsRemaining,
      count: ownerSettlementsCount,
    },

    finance: {
      netResult,
      totalLatePaymentsAmount,
    },

    alerts: {
      latePayments: latePayments.map((item) => ({
        id: item.id,
        contractId: item.contractId,
        driverName: item.driver?.fullName || '-',
        vehicleLabel: `${item.vehicle?.brand || ''} ${item.vehicle?.model || ''}`.trim(),
        expectedAmount: this.toNumber(item.expectedAmount),
        paidAmount: this.toNumber(item.paidAmount),
        remainingAmount: this.toNumber(item.remainingAmount),
        status: item.status,
        paymentDate: item.paymentDate,
        createdAt: item.createdAt,
      })),

      upcomingMaintenances: upcomingMaintenances.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        scheduledDate: item.scheduledDate,
        nextDueDate: item.nextDueDate,
        actualCost: this.toNumber(item.actualCost),
        estimatedCost: this.toNumber(item.estimatedCost),
        vehicle: item.vehicle
          ? {
              id: item.vehicle.id,
              brand: item.vehicle.brand,
              model: item.vehicle.model,
              registrationNumber: item.vehicle.registrationNumber,
            }
          : null,
      })),

      overdueMaintenances: overdueMaintenances.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        scheduledDate: item.scheduledDate,
        nextDueDate: item.nextDueDate,
        vehicle: item.vehicle
          ? {
              id: item.vehicle.id,
              brand: item.vehicle.brand,
              model: item.vehicle.model,
              registrationNumber: item.vehicle.registrationNumber,
            }
          : null,
      })),

      insuranceExpiringSoon: insuranceExpiringSoon.map((item) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        registrationNumber: item.registrationNumber,
        insuranceExpiry: item.insuranceExpiry,
      })),

      technicalVisitsExpiringSoon: technicalVisitsExpiringSoon.map((item) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        registrationNumber: item.registrationNumber,
        technicalVisitExpiry: item.technicalVisitExpiry,
      })),
    },

    latestDriverPayments: latestDriverPayments.map((item) => ({
      id: item.id,
      amount: this.toNumber(item.paidAmount),
      expectedAmount: this.toNumber(item.expectedAmount),
      remainingAmount: this.toNumber(item.remainingAmount),
      paymentDate: item.paymentDate,
      paidAt: item.paymentDate,
      createdAt: item.createdAt,
      paymentMethod: item.paymentMethod,
      reference: item.reference,
      status: item.status,
      driver: item.driver
        ? {
            id: item.driver.id,
            fullName: item.driver.fullName,
            phone: item.driver.phone,
          }
        : null,
      vehicle: item.vehicle
        ? {
            id: item.vehicle.id,
            brand: item.vehicle.brand,
            model: item.vehicle.model,
            registrationNumber: item.vehicle.registrationNumber,
          }
        : null,
      contract: item.contract
        ? {
            id: item.contract.id,
            contractType: item.contract.contractType,
            status: item.contract.status,
          }
        : null,
    })),

    latestExpenses: latestExpenses.map((item) => ({
      id: item.id,
      label: item.label,
      amount: this.toNumber(item.amount),
      expenseDate: item.expenseDate,
      category: item.category,
      vehicle: item.vehicle
        ? {
            id: item.vehicle.id,
            brand: item.vehicle.brand,
            model: item.vehicle.model,
            registrationNumber: item.vehicle.registrationNumber,
          }
        : null,
    })),
  };
}
}
