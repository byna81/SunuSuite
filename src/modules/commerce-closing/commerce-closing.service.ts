import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommerceClosingService {
  constructor(private readonly prisma: PrismaService) {}

  async getClosingSummary(query: {
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
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
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

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    const netResult = totalPayments - totalRefunds - totalExpenses;

    const previousClosing = await this.prisma.commerceClosing.findFirst({
      where: {
        tenantId,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { closedAt: 'desc' },
      ],
    });

    return {
      month,
      year,
      openingBalance: Number(previousClosing?.closingBalance || 0),
      totalSales,
      totalPayments,
      totalRefunds,
      totalExpenses,
      netResult,
      suggestedClosingBalance:
        Number(previousClosing?.closingBalance || 0) + netResult,
    };
  }

  async createClosing(body: {
    tenantId: string;
    month: number;
    year: number;
    openingBalance?: number;
    note?: string;
    closedBy?: string;
  }) {
    const tenantId = body.tenantId?.trim();
    const month = Number(body.month);
    const year = Number(body.year);
    const openingBalance = Number(body.openingBalance || 0);
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
      },
      orderBy: {
        closedAt: 'desc',
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Une clôture existe déjà pour cette période',
      );
    }

    const summary = await this.getClosingSummary({
      tenantId,
      month: String(month),
      year: String(year),
    });

    const closingBalance = openingBalance + Number(summary.netResult || 0);

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
        note,
        closedBy,
      },
    });
  }

  async getClosings(query: {
    tenantId: string;
    month?: string;
    year?: string;
  }) {
    const tenantId = query.tenantId?.trim();

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
