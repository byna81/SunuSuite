import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommerceClosingService {
  constructor(private readonly prisma: PrismaService) {}

  async getCashiersForClosing(query: {
    tenantId: string;
    month?: string;
    year?: string;
  }) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire');
    }

    const now = new Date();
    const month = query.month ? Number(query.month) : now.getMonth() + 1;
    const year = query.year ? Number(query.year) : now.getFullYear();

    if (
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      month < 1 ||
      month > 12
    ) {
      throw new BadRequestException('Mois ou année invalide');
    }

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        cashierId: { not: null },
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        cashier: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const grouped = new Map<
      string,
      {
        cashierId: string;
        cashierName: string;
        salesCount: number;
        totalSales: number;
        totalPayments: number;
      }
    >();

    for (const sale of sales) {
      if (!sale.cashierId) continue;

      const key = sale.cashierId;

      if (!grouped.has(key)) {
        grouped.set(key, {
          cashierId: sale.cashierId,
          cashierName:
            sale.cashier?.fullName ||
            sale.cashier?.login ||
            sale.cashier?.email ||
            'Caisse',
          salesCount: 0,
          totalSales: 0,
          totalPayments: 0,
        });
      }

      const row = grouped.get(key)!;
      row.salesCount += 1;
      row.totalSales += Number(sale.total || 0);
      row.totalPayments += sale.payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.totalPayments - a.totalPayments,
    );
  }

  async getClosingSummary(query: {
    tenantId: string;
    month?: string;
    year?: string;
    cashierId?: string;
  }) {
    const tenantId = query.tenantId?.trim();
    const cashierId = query.cashierId?.trim() || undefined;

    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire');
    }

    const now = new Date();
    const month = query.month ? Number(query.month) : now.getMonth() + 1;
    const year = query.year ? Number(query.year) : now.getFullYear();

    if (
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      month < 1 ||
      month > 12
    ) {
      throw new BadRequestException('Mois ou année invalide');
    }

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);

    const saleWhere: any = {
      tenantId,
      createdAt: {
        gte: start,
        lt: end,
      },
    };

    if (cashierId) {
      saleWhere.cashierId = cashierId;
    }

    const sales = await this.prisma.sale.findMany({
      where: saleWhere,
      include: {
        cashier: true,
        payments: true,
        returns: {
          include: {
            refunds: true,
          },
        },
      },
    });

    const expenses = await this.prisma.commerceExpense.findMany({
      where: {
        tenantId,
        expenseDate: {
          gte: start,
          lt: end,
        },
      },
    });

    const totalSales = sales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

    const totalPayments = sales.reduce((sum, sale) => {
      const paymentsTotal = sale.payments.reduce(
        (pSum, payment) => pSum + Number(payment.amount || 0),
        0,
      );
      return sum + paymentsTotal;
    }, 0);

    const totalRefunds = sales.reduce((sum, sale) => {
      const refundsTotal = sale.returns.reduce((rSum, saleReturn) => {
        const saleRefunds = saleReturn.refunds.reduce(
          (fSum, refund) => fSum + Number(refund.amount || 0),
          0,
        );
        return rSum + saleRefunds;
      }, 0);

      return sum + refundsTotal;
    }, 0);

    const totalExpenses = cashierId
      ? 0
      : expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const cashPayments = sales.reduce((sum, sale) => {
      const cashTotal = sale.payments
        .filter((payment) => String(payment.method || '').toLowerCase() === 'cash')
        .reduce((pSum, payment) => pSum + Number(payment.amount || 0), 0);

      return sum + cashTotal;
    }, 0);

    const wavePayments = sales.reduce((sum, sale) => {
      const waveTotal = sale.payments
        .filter((payment) => String(payment.method || '').toLowerCase() === 'wave')
        .reduce((pSum, payment) => pSum + Number(payment.amount || 0), 0);

      return sum + waveTotal;
    }, 0);

    const orangeMoneyPayments = sales.reduce((sum, sale) => {
      const omTotal = sale.payments
        .filter((payment) => {
          const method = String(payment.method || '').toLowerCase();
          return method === 'orange_money' || method === 'orange money';
        })
        .reduce((pSum, payment) => pSum + Number(payment.amount || 0), 0);

      return sum + omTotal;
    }, 0);

    const cardPayments = sales.reduce((sum, sale) => {
      const cardTotal = sale.payments
        .filter((payment) => {
          const method = String(payment.method || '').toLowerCase();
          return method === 'card' || method === 'carte';
        })
        .reduce((pSum, payment) => pSum + Number(payment.amount || 0), 0);

      return sum + cardTotal;
    }, 0);

    const netResult = totalPayments - totalRefunds - totalExpenses;

    const previousWhere: any = { tenantId };
    if (cashierId) {
      previousWhere.closedBy = cashierId;
    }

    const previousClosing = await this.prisma.commerceClosing.findFirst({
      where: previousWhere,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { closedAt: 'desc' },
      ],
    });

    const cashier =
      cashierId
        ? await this.prisma.user.findUnique({
            where: { id: cashierId },
            select: {
              id: true,
              fullName: true,
              login: true,
              email: true,
            },
          })
        : null;

    return {
      month,
      year,
      cashierId: cashierId || null,
      cashierName: cashier
        ? cashier.fullName || cashier.login || cashier.email || 'Caisse'
        : null,
      openingBalance: Number(previousClosing?.closingBalance || 0),
      totalSales,
      totalPayments,
      totalRefunds,
      totalExpenses,
      cashPayments,
      wavePayments,
      orangeMoneyPayments,
      cardPayments,
      netResult,
      suggestedClosingBalance:
        Number(previousClosing?.closingBalance || 0) + cashPayments - totalRefunds,
      salesCount: sales.length,
    };
  }

  async createClosing(body: {
    tenantId: string;
    month: number;
    year: number;
    openingBalance?: number;
    actualCash?: number;
    cashierId?: string;
    note?: string;
    closedBy?: string;
  }) {
    const tenantId = body.tenantId?.trim();
    const cashierId = body.cashierId?.trim() || undefined;
    const month = Number(body.month);
    const year = Number(body.year);
    const openingBalance = Number(body.openingBalance || 0);
    const actualCash = Number(body.actualCash || 0);
    const note = body.note?.trim() || null;
    const closedBy = body.closedBy?.trim() || null;

    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire');
    }

    if (
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      month < 1 ||
      month > 12
    ) {
      throw new BadRequestException('Mois ou année invalide');
    }

    const existing = await this.prisma.commerceClosing.findFirst({
      where: {
        tenantId,
        month,
        year,
        ...(cashierId ? { closedBy: cashierId } : {}),
      },
      orderBy: {
        closedAt: 'desc',
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Une clôture existe déjà pour cette période et cette caisse',
      );
    }

    const summary = await this.getClosingSummary({
      tenantId,
      month: String(month),
      year: String(year),
      cashierId,
    });

    const expectedCash =
      openingBalance +
      Number(summary.cashPayments || 0) -
      Number(summary.totalRefunds || 0);

    const closingBalance = actualCash || expectedCash;
    const gap = actualCash - expectedCash;

    const finalNote = [
      note,
      cashierId ? `cashierId=${cashierId}` : null,
      `expectedCash=${expectedCash}`,
      `actualCash=${actualCash}`,
      `gap=${gap}`,
    ]
      .filter(Boolean)
      .join(' | ');

    return this.prisma.commerceClosing.create({
      data: {
        tenantId,
        month,
        year,
        openingBalance,
        totalSales: Number(summary.totalSales || 0),
        totalPayments: Number(summary.totalPayments || 0),
        totalRefunds: Number(summary.totalRefunds || 0),
        totalExpenses: Number(summary.totalExpenses || 0),
        closingBalance,
        netResult: Number(summary.netResult || 0),
        note: finalNote || null,
        closedBy: cashierId || closedBy,
      },
    });
  }

  async getClosings(query: {
    tenantId: string;
    month?: string;
    year?: string;
    cashierId?: string;
  }) {
    const tenantId = query.tenantId?.trim();
    const cashierId = query.cashierId?.trim() || undefined;

    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire');
    }

    const where: any = { tenantId };

    if (query.month) {
      where.month = Number(query.month);
    }

    if (query.year) {
      where.year = Number(query.year);
    }

    if (cashierId) {
      where.closedBy = cashierId;
    }

    return this.prisma.commerceClosing.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { closedAt: 'desc' },
      ],
    });
  }
}
