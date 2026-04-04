import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommerceAccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async createExpense(body: {
    tenantId: string;
    label: string;
    category: string;
    amount: number;
    expenseDate?: string;
    paymentMethod?: string;
    note?: string;
  }) {
    const tenantId = body.tenantId?.trim();
    const label = body.label?.trim();
    const category = body.category?.trim();
    const amount =
      typeof body.amount === 'number' ? Number(body.amount) : Number(body.amount);
    const paymentMethod = body.paymentMethod?.trim() || null;
    const note = body.note?.trim() || null;
    const expenseDate = body.expenseDate ? new Date(body.expenseDate) : new Date();

    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire');
    }

    if (!label) {
      throw new BadRequestException('Le libellé est obligatoire');
    }

    if (!category) {
      throw new BadRequestException('La catégorie est obligatoire');
    }

    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    return this.prisma.commerceExpense.create({
      data: {
        tenantId,
        label,
        category,
        amount,
        expenseDate,
        paymentMethod,
        note,
      },
    });
  }

  async getExpenses(query: {
    tenantId: string;
    month?: string;
    year?: string;
  }) {
    const tenantId = query.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId est obligatoire');
    }

    const where: any = { tenantId };

    if (query.month && query.year) {
      const month = Number(query.month);
      const year = Number(query.year);

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

      where.expenseDate = {
        gte: start,
        lt: end,
      };
    }

    return this.prisma.commerceExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });
  }

  async deleteExpense(id: string, tenantId: string) {
    const expense = await this.prisma.commerceExpense.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!expense) {
      throw new BadRequestException('Dépense introuvable');
    }

    await this.prisma.commerceExpense.delete({
      where: { id },
    });

    return { message: 'Dépense supprimée avec succès' };
  }

  async getSummary(query: {
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

    const grossSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);

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

    return {
      month,
      year,
      grossSales,
      totalPayments,
      totalRefunds,
      totalExpenses,
      netResult,
      expensesCount: expenses.length,
      salesCount: sales.length,
    };
  }
}
