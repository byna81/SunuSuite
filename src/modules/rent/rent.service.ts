import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument = require('pdfkit');

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
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
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

    if (!item) {
      throw new Error('Loyer introuvable');
    }

    return item;
  }

  async findActiveTenantsForRent(tenantId: string) {
    return this.prisma.tenantProperty.findMany({
      where: {
        status: 'actif',
        property: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    tenantId: string,
    body: {
      propertyId: string;
      tenantPropertyId: string;
      month: number;
      year: number;
      amountDue?: number;
      dueDate?: string;
      note?: string;
    },
  ) {
    const tenantProperty = await this.prisma.tenantProperty.findFirst({
      where: {
        id: body.tenantPropertyId,
        status: 'actif',
        property: {
          id: body.propertyId,
          tenantId,
        },
      },
      include: {
        property: true,
      },
    });

    if (!tenantProperty) {
      throw new Error('Locataire actif introuvable pour ce bien');
    }

    const month = Number(body.month);
    const year = Number(body.year);

    if (!month || month < 1 || month > 12) {
      throw new Error('Mois invalide');
    }

    if (!year || year < 2000) {
      throw new Error('Année invalide');
    }

    const existing = await this.prisma.rentPayment.findFirst({
      where: {
        propertyId: body.propertyId,
        tenantPropertyId: body.tenantPropertyId,
        month,
        year,
      },
    });

    if (existing) {
      throw new Error('Un loyer existe déjà pour cette période');
    }

    const amountDue =
      body.amountDue && Number(body.amountDue) > 0
        ? Number(body.amountDue)
        : Number(tenantProperty.rent || 0);

    return this.prisma.rentPayment.create({
      data: {
        tenantId,
        propertyId: body.propertyId,
        tenantPropertyId: body.tenantPropertyId,
        month,
        year,
        amountDue,
        amountPaid: 0,
        remainingAmount: amountDue,
        status: 'a_payer',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        note: body.note?.trim() || null,
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }

  async pay(
    tenantId: string,
    id: string,
    body: {
      amountPaid: number;
      paymentMethod?: string;
      paymentReference?: string;
      paymentDate?: string;
      note?: string;
    },
  ) {
    const item = await this.prisma.rentPayment.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      throw new Error('Loyer introuvable');
    }

    const incoming = Number(body.amountPaid || 0);

    if (incoming <= 0) {
      throw new Error('Le montant payé doit être supérieur à 0');
    }

    const newAmountPaid = Number(item.amountPaid) + incoming;
    const remainingAmount = Math.max(Number(item.amountDue) - newAmountPaid, 0);

    let status: 'a_payer' | 'partiel' | 'paye' | 'en_retard' = 'a_payer';

    if (newAmountPaid <= 0) {
      status = 'a_payer';
    } else if (remainingAmount > 0) {
      status = 'partiel';
    } else {
      status = 'paye';
    }

    return this.prisma.rentPayment.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        remainingAmount,
        status,
        paymentMethod: body.paymentMethod?.trim() || item.paymentMethod || null,
        paymentReference:
          body.paymentReference?.trim() || item.paymentReference || null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        note: body.note?.trim() || item.note || null,
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }

  async markLate(tenantId: string, id: string) {
    const item = await this.prisma.rentPayment.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      throw new Error('Loyer introuvable');
    }

    if (item.status === 'paye') {
      return item;
    }

    return this.prisma.rentPayment.update({
      where: { id },
      data: {
        status: 'en_retard',
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }

  private createBasePdf() {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    return { doc, buffers };
  }

  private finalize(doc: any, buffers: Buffer[]): Promise<Buffer> {
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end();
    });
  }

  async getNoticePdf(tenantId: string, id: string): Promise<Buffer> {
    const item = await this.findOne(tenantId, id);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const agencyName = tenant?.name || 'Agence immobilière';
    const agencySubtitle =
      tenant?.address || 'Gestion immobilière professionnelle';

    const { doc, buffers } = this.createBasePdf();

    doc.fontSize(18).fillColor('#111827').text(agencyName);
    doc.fontSize(10).fillColor('#6b7280').text(agencySubtitle);

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(20).fillColor('#111827').text("AVIS D'ÉCHÉANCE", {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(12).fillColor('#111827');
    doc.text(`Locataire : ${item.tenantProperty.name}`);
    doc.text(`Bien : ${item.property.title}`);
    doc.text(`Période : ${item.month}/${item.year}`);
    doc.moveDown();

    const top = doc.y;
    doc.rect(40, top, 500, 80).stroke();
    doc.text(`Montant à payer : ${item.amountDue} FCFA`, 50, top + 12);
    doc.text(`Reste : ${item.remainingAmount} FCFA`, 50, top + 32);
    doc.text(
      `Date d'échéance : ${
        item.dueDate ? new Date(item.dueDate).toLocaleDateString('fr-FR') : '-'
      }`,
      50,
      top + 52,
    );

    doc.moveDown(6);
    doc
      .fillColor('#6b7280')
      .text('Merci de procéder au règlement avant la date d’échéance.', {
        align: 'center',
      });

    return this.finalize(doc, buffers);
  }

  async getReceiptPdf(tenantId: string, id: string): Promise<Buffer> {
    const item = await this.findOne(tenantId, id);

    if (item.status !== 'paye') {
      throw new Error('Quittance disponible uniquement si le loyer est payé');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const agencyName = tenant?.name || 'Agence immobilière';
    const agencySubtitle =
      tenant?.address || 'Gestion immobilière professionnelle';

    const { doc, buffers } = this.createBasePdf();

    doc.fontSize(18).fillColor('#111827').text(agencyName);
    doc.fontSize(10).fillColor('#6b7280').text(agencySubtitle);

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(20).fillColor('#111827').text('QUITTANCE DE LOYER', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(12).fillColor('#111827');
    doc.text(`Locataire : ${item.tenantProperty.name}`);
    doc.text(`Bien : ${item.property.title}`);
    doc.text(`Période : ${item.month}/${item.year}`);
    doc.moveDown();

    const top = doc.y;
    doc.rect(40, top, 500, 100).stroke();
    doc.text(`Montant payé : ${item.amountPaid} FCFA`, 50, top + 12);
    doc.text(
      `Date : ${
        item.paymentDate
          ? new Date(item.paymentDate).toLocaleDateString('fr-FR')
          : '-'
      }`,
      50,
      top + 34,
    );
    doc.text(`Mode : ${item.paymentMethod || '-'}`, 50, top + 56);
    doc.text(`Référence : ${item.paymentReference || '-'}`, 50, top + 78);

    doc.moveDown(7);
    doc
      .fontSize(14)
      .fillColor('#16a34a')
      .text('LOYER ACQUITTÉ', { align: 'center' });

    return this.finalize(doc, buffers);
  }
}
