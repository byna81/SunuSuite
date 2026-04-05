import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

@Injectable()
export class RealEstateAccountingService {
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

    return this.prisma.realEstateExpense.create({
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

    return this.prisma.realEstateExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });
  }

  async deleteExpense(id: string, tenantId: string) {
    const expense = await this.prisma.realEstateExpense.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!expense) {
      throw new BadRequestException('Dépense introuvable');
    }

    await this.prisma.realEstateExpense.delete({
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

    const rentPayments = await this.prisma.rentPayment.findMany({
      where: {
        tenantId,
        paymentDate: {
          gte: start,
          lt: end,
        },
      },
      include: {
        property: true,
        tenantProperty: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    const ownerPayments = await this.prisma.ownerPayment.findMany({
      where: {
        tenantId,
        paidAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        property: true,
        owner: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    const expenses = await this.prisma.realEstateExpense.findMany({
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

    const totalRentCollected = rentPayments.reduce(
      (sum, payment) => sum + Number(payment.amountPaid || 0),
      0,
    );

    const totalOwnerPaid = ownerPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    const netResult = totalRentCollected - totalOwnerPaid - totalExpenses;

    return {
      month,
      year,
      totalRentCollected,
      totalOwnerPaid,
      totalExpenses,
      netResult,
      rentsCount: rentPayments.length,
      ownerPaymentsCount: ownerPayments.length,
      expensesCount: expenses.length,
      expenses,
      ownerPayments,
      rentPayments,
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

    return tenant?.name || 'Agence immobilière';
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

    doc.fontSize(20).text('Rapport de comptabilité immobilière', {
      align: 'center',
    });
    doc.moveDown();
    doc.fontSize(14).text(`Agence : ${tenantName}`);
    doc.text(`Période : ${summary.month}/${summary.year}`);
    doc.moveDown();

    doc
      .fontSize(13)
      .text(`Loyers encaissés : ${this.formatAmount(summary.totalRentCollected)}`);
    doc.text(`Paiements propriétaires : ${this.formatAmount(summary.totalOwnerPaid)}`);
    doc.text(`Dépenses agence : ${this.formatAmount(summary.totalExpenses)}`);
    doc.text(`Résultat net agence : ${this.formatAmount(summary.netResult)}`);
    doc.text(`Nombre de loyers encaissés : ${summary.rentsCount}`);
    doc.text(`Nombre de paiements propriétaires : ${summary.ownerPaymentsCount}`);
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

    doc.moveDown();
    doc.fontSize(15).text('Paiements propriétaires', { underline: true });
    doc.moveDown(0.5);

    if (summary.ownerPayments.length === 0) {
      doc.fontSize(12).text('Aucun paiement propriétaire sur cette période.');
    } else {
      summary.ownerPayments.forEach((payment, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${payment.owner?.name || '-'} | ${
              payment.property?.title || '-'
            } | ${this.formatAmount(Number(payment.amount || 0))} | ${new Date(
              payment.paidAt,
            ).toLocaleDateString('fr-FR')}`,
          );
        doc.moveDown(0.4);
      });
    }

    doc.end();

    const buffer: Buffer = await new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return {
      fileName: `comptabilite-immobilier-${summary.month}-${summary.year}.pdf`,
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
      { header: 'Indicateur', key: 'label', width: 35 },
      { header: 'Valeur', key: 'value', width: 25 },
    ];

    resumeSheet.addRows([
      { label: 'Agence', value: tenantName },
      { label: 'Période', value: `${summary.month}/${summary.year}` },
      { label: 'Loyers encaissés', value: summary.totalRentCollected },
      { label: 'Paiements propriétaires', value: summary.totalOwnerPaid },
      { label: 'Dépenses agence', value: summary.totalExpenses },
      { label: 'Résultat net agence', value: summary.netResult },
      { label: 'Nombre de loyers encaissés', value: summary.rentsCount },
      {
        label: 'Nombre de paiements propriétaires',
        value: summary.ownerPaymentsCount,
      },
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

    const ownerPaymentsSheet = workbook.addWorksheet('Paiements propriétaires');
    ownerPaymentsSheet.columns = [
      { header: 'Date', key: 'paidAt', width: 18 },
      { header: 'Propriétaire', key: 'owner', width: 25 },
      { header: 'Bien', key: 'property', width: 28 },
      { header: 'Montant', key: 'amount', width: 18 },
      { header: 'Méthode', key: 'paymentMethod', width: 18 },
      { header: 'Référence', key: 'reference', width: 22 },
    ];

    summary.ownerPayments.forEach((payment) => {
      ownerPaymentsSheet.addRow({
        paidAt: new Date(payment.paidAt).toLocaleDateString('fr-FR'),
        owner: payment.owner?.name || '',
        property: payment.property?.title || '',
        amount: Number(payment.amount || 0),
        paymentMethod: payment.paymentMethod || '',
        reference: payment.reference || '',
      });
    });

    resumeSheet.getRow(1).font = { bold: true };
    expensesSheet.getRow(1).font = { bold: true };
    ownerPaymentsSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      fileName: `comptabilite-immobilier-${summary.month}-${summary.year}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: Buffer.from(buffer).toString('base64'),
    };
  }
}
