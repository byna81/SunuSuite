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
    return {
      revenues: { totalDriverPayments: 0 },
      expenses: { totalExpenses: 0 },
      finance: { netResult: 0, totalLatePaymentsAmount: 0 },
    };
  }
}
