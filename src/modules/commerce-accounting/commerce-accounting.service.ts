import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

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
      orderBy: {
        expenseDate: 'desc',
      },
    });

    const grossSales = sales.reduce(
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
      expenses,
    };
  }

  private formatAmount(value: number) {
    const num = Math.round(Number(value || 0));
    const formatted = String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
  }

  private async getTenantName(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    return tenant?.name || 'Boutique';
  }

  async exportPdf(query: {
    tenantId: string;
    month?: string;
    year?: string;
  }) {
    const summary = await this.getSummary(query);
    const tenantName = await this.getTenantName(query.tenantId);

    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Rapport de comptabilité commerce', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Boutique : ${tenantName}`);
    doc.text(`Période : ${summary.month}/${summary.year}`);
    doc.moveDown();

    doc.fontSize(13).text(`Chiffre d'affaires : ${this.formatAmount(summary.grossSales)}`);
    doc.text(`Encaissements : ${this.formatAmount(summary.totalPayments)}`);
    doc.text(`Remboursements : ${this.formatAmount(summary.totalRefunds)}`);
    doc.text(`Dépenses : ${this.formatAmount(summary.totalExpenses)}`);
    doc.text(`Bénéfice net : ${this.formatAmount(summary.netResult)}`);
    doc.text(`Nombre de ventes : ${summary.salesCount}`);
    doc.text(`Nombre de dépenses : ${summary.expensesCount}`);

    doc.moveDown();
    doc.fontSize(15).text('Détail des dépenses', { underline: true });
    doc.moveDown(0.5);

    if (summary.expenses.length === 0) {
      doc.fontSize(12).text('Aucune dépense sur cette période.');
    } else {
      summary.expenses.forEach((expense, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${expense.label} | ${expense.category} | ${this.formatAmount(
              Number(expense.amount || 0),
            )} | ${new Date(expense.expenseDate).toLocaleDateString('fr-FR')}`,
          );

        if (expense.paymentMethod) {
          doc.text(`   Paiement : ${expense.paymentMethod}`);
        }

        if (expense.note) {
          doc.text(`   Note : ${expense.note}`);
        }

        doc.moveDown(0.4);
      });
    }

    doc.end();

    const buffer: Buffer = await new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return {
      fileName: `comptabilite-commerce-${summary.month}-${summary.year}.pdf`,
      mimeType: 'application/pdf',
      base64: buffer.toString('base64'),
    };
  }

  async exportExcel(query: {
    tenantId: string;
    month?: string;
    year?: string;
  }) {
    const summary = await this.getSummary(query);
    const tenantName = await this.getTenantName(query.tenantId);

    const workbook = new ExcelJS.Workbook();

    const resumeSheet = workbook.addWorksheet('Résumé');
    resumeSheet.columns = [
      { header: 'Indicateur', key: 'label', width: 30 },
      { header: 'Valeur', key: 'value', width: 25 },
    ];

    resumeSheet.addRows([
      { label: 'Boutique', value: tenantName },
      { label: 'Période', value: `${summary.month}/${summary.year}` },
      { label: "Chiffre d'affaires", value: summary.grossSales },
      { label: 'Encaissements', value: summary.totalPayments },
      { label: 'Remboursements', value: summary.totalRefunds },
      { label: 'Dépenses', value: summary.totalExpenses },
      { label: 'Bénéfice net', value: summary.netResult },
      { label: 'Nombre de ventes', value: summary.salesCount },
      { label: 'Nombre de dépenses', value: summary.expensesCount },
    ]);

    const expensesSheet = workbook.addWorksheet('Dépenses');
    expensesSheet.columns = [
      { header: 'Date', key: 'expenseDate', width: 18 },
      { header: 'Libellé', key: 'label', width: 28 },
      { header: 'Catégorie', key: 'category', width: 20 },
      { header: 'Montant', key: 'amount', width: 18 },
      { header: 'Paiement', key: 'paymentMethod', width: 20 },
      { header: 'Note', key: 'note', width: 30 },
    ];

    summary.expenses.forEach((expense) => {
      expensesSheet.addRow({
        expenseDate: new Date(expense.expenseDate).toLocaleDateString('fr-FR'),
        label: expense.label,
        category: expense.category,
        amount: Number(expense.amount || 0),
        paymentMethod: expense.paymentMethod || '',
        note: expense.note || '',
      });
    });

    resumeSheet.getRow(1).font = { bold: true };
    expensesSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      fileName: `comptabilite-commerce-${summary.month}-${summary.year}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: Buffer.from(buffer).toString('base64'),
    };
  }
}
