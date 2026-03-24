import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class RentService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.rentPayment.findMany({
      where: { tenantId },
      include: {
        property: true,
        tenantProperty: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.rentPayment.findFirst({
      where: { id, tenantId },
      include: {
        property: true,
        tenantProperty: true,
      },
    });

    if (!item) throw new Error('Loyer introuvable');
    return item;
  }

  // =========================
  // PDF GENERATOR PREMIUM
  // =========================
  private createBasePdf(title: string) {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: any[] = [];

    doc.on('data', buffers.push.bind(buffers));

    const header = () => {
      doc
        .fontSize(18)
        .fillColor('#111827')
        .text('SUNUSUITE IMMOBILIER', { align: 'left' });

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text('Gestion immobilière professionnelle');

      doc.moveDown();
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc
        .fontSize(20)
        .fillColor('#111827')
        .text(title, { align: 'center' });

      doc.moveDown();
    };

    header();

    return { doc, buffers };
  }

  private finalize(doc: PDFKit.PDFDocument, buffers: any[]): Promise<Buffer> {
    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.end();
    });
  }

  async getNoticePdf(tenantId: string, id: string): Promise<Buffer> {
    const item = await this.findOne(tenantId, id);

    const { doc, buffers } = this.createBasePdf('AVIS D’ÉCHÉANCE');

    doc.fontSize(12).text(`Locataire : ${item.tenantProperty.name}`);
    doc.text(`Bien : ${item.property.title}`);
    doc.text(`Période : ${item.month}/${item.year}`);
    doc.moveDown();

    doc
      .rect(40, doc.y, 500, 80)
      .stroke()
      .text(`Montant à payer : ${item.amountDue} FCFA`, 50, doc.y + 10)
      .text(`Reste : ${item.remainingAmount} FCFA`, 50, doc.y + 30);

    doc.moveDown(6);

    doc
      .fillColor('#6b7280')
      .text(
        'Merci de régler votre loyer avant la date d’échéance.',
        { align: 'center' },
      );

    return this.finalize(doc, buffers);
  }

  async getReceiptPdf(tenantId: string, id: string): Promise<Buffer> {
    const item = await this.findOne(tenantId, id);

    if (item.status !== 'paye') {
      throw new Error('Quittance disponible uniquement si payé');
    }

    const { doc, buffers } = this.createBasePdf(
      'QUITTANCE DE LOYER',
    );

    doc.fontSize(12).text(`Locataire : ${item.tenantProperty.name}`);
    doc.text(`Bien : ${item.property.title}`);
    doc.text(`Période : ${item.month}/${item.year}`);
    doc.moveDown();

    doc
      .rect(40, doc.y, 500, 100)
      .stroke()
      .text(`Montant payé : ${item.amountPaid} FCFA`, 50, doc.y + 10)
      .text(
        `Date : ${
          item.paymentDate
            ? new Date(item.paymentDate).toLocaleDateString('fr-FR')
            : '-'
        }`,
        50,
        doc.y + 30,
      )
      .text(`Mode : ${item.paymentMethod || '-'}`, 50, doc.y + 50);

    doc.moveDown(6);

    doc
      .fontSize(14)
      .fillColor('#16a34a')
      .text('LOYER ACQUITTÉ', { align: 'center' });

    return this.finalize(doc, buffers);
  }
}
