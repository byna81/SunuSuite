import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument = require('pdfkit');

@Injectable()
export class OwnerPaymentService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.ownerPayment.findMany({
      where: { tenantId },
      include: {
        owner: true,
        property: true,
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.ownerPayment.findFirst({
      where: { id, tenantId },
      include: {
        owner: true,
        property: true,
        tenant: true,
      },
    });

    if (!item) {
      throw new Error('Versement introuvable');
    }

    return item;
  }

  async getCreateData(tenantId: string) {
    const owners = await this.prisma.owner.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const properties = await this.prisma.property.findMany({
      where: { tenantId },
      include: { owner: true },
      orderBy: { title: 'asc' },
    });

    return { owners, properties };
  }

  async create(
    tenantId: string,
    paidBy: string,
    body: {
      ownerId: string;
      propertyId: string;
      amount: number;
      paymentMethod: string;
      otherMethod?: string;
      reference?: string;
      note?: string;
      periodLabel?: string;
      paidAt?: string;
    },
  ) {
    const owner = await this.prisma.owner.findFirst({
      where: {
        id: body.ownerId,
        tenantId,
      },
    });

    if (!owner) {
      throw new Error('Propriétaire introuvable');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: body.propertyId,
        tenantId,
      },
    });

    if (!property) {
      throw new Error('Bien introuvable');
    }

    if (property.ownerId && property.ownerId !== owner.id) {
      throw new Error('Ce bien n’est pas rattaché à ce propriétaire');
    }

    const amount = Number(body.amount || 0);

    if (amount <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }

    if (!body.paymentMethod?.trim()) {
      throw new Error('Le moyen de paiement est obligatoire');
    }

    return this.prisma.ownerPayment.create({
      data: {
        tenantId,
        ownerId: owner.id,
        propertyId: property.id,
        amount,
        paymentMethod: body.paymentMethod.trim(),
        otherMethod: body.otherMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        periodLabel: body.periodLabel?.trim() || null,
        paidBy,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      },
      include: {
        owner: true,
        property: true,
        tenant: true,
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

  async getPdf(tenantId: string, id: string): Promise<Buffer> {
    const item = await this.findOne(tenantId, id);

    const agencyName = item.tenant?.name || 'Agence immobilière';
    const agencySubtitle =
      item.tenant?.address || 'Gestion immobilière professionnelle';

    const { doc, buffers } = this.createBasePdf();

    doc.fontSize(18).fillColor('#111827').text(agencyName);
    doc.fontSize(10).fillColor('#6b7280').text(agencySubtitle);

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(20).fillColor('#111827').text('VERSEMENT PROPRIÉTAIRE', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(12).fillColor('#111827');
    doc.text(`Propriétaire : ${item.owner.name}`);
    doc.text(`Bien : ${item.property.title}`);
    doc.text(`Adresse du bien : ${item.property.address}`);
    doc.text(`Période : ${item.periodLabel || '-'}`);
    doc.moveDown();

    const top = doc.y;
    doc.rect(40, top, 500, 125).stroke();
    doc.text(`Montant versé : ${item.amount} FCFA`, 50, top + 12);
    doc.text(
      `Date de versement : ${new Date(item.paidAt).toLocaleDateString('fr-FR')}`,
      50,
      top + 34,
    );
    doc.text(
      `Moyen de paiement : ${
        item.paymentMethod === 'other'
          ? item.otherMethod || 'Autre'
          : item.paymentMethod
      }`,
      50,
      top + 56,
    );
    doc.text(`Référence : ${item.reference || '-'}`, 50, top + 78);
    doc.text(`Versé par : ${item.paidBy || '-'}`, 50, top + 100);

    doc.moveDown(8);
    doc.fontSize(11).fillColor('#6b7280').text(`Note : ${item.note || '-'}`);

    return this.finalize(doc, buffers);
  }
}
