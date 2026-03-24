import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  generateNoticePdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    doc.fontSize(18).fillColor('#111827').text('SUNUSUITE IMMOBILIER');
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
      .text("AVIS D'ÉCHÉANCE", { align: 'center' });

    doc.moveDown();
    doc.fontSize(12).fillColor('#111827');
    doc.text(`Agence : ${data.agency || 'SunuSuite'}`);
    doc.text(`Locataire : ${data.tenant || '-'}`);
    doc.text(`Bien : ${data.property || '-'}`);
    doc.text(`Période : ${data.period || '-'}`);
    doc.moveDown();

    const top = doc.y;
    doc.rect(40, top, 500, 90).stroke();
    doc.text(`Montant à payer : ${data.amountDue || 0} FCFA`, 50, top + 12);
    doc.text(`Reste à payer : ${data.remaining || 0} FCFA`, 50, top + 34);
    doc.text(`Date d'échéance : ${data.dueDate || '-'}`, 50, top + 56);

    doc.moveDown(6);
    doc
      .fontSize(11)
      .fillColor('#6b7280')
      .text('Merci de procéder au règlement avant la date d’échéance.', {
        align: 'center',
      });

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end();
    });
  }

  generateReceiptPdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    doc.fontSize(18).fillColor('#111827').text('SUNUSUITE IMMOBILIER');
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
      .text('QUITTANCE DE LOYER', { align: 'center' });

    doc.moveDown();
    doc.fontSize(12).fillColor('#111827');
    doc.text(`Agence : ${data.agency || 'SunuSuite'}`);
    doc.text(`Locataire : ${data.tenant || '-'}`);
    doc.text(`Bien : ${data.property || '-'}`);
    doc.text(`Période : ${data.period || '-'}`);
    doc.moveDown();

    const top = doc.y;
    doc.rect(40, top, 500, 105).stroke();
    doc.text(`Montant payé : ${data.amountPaid || 0} FCFA`, 50, top + 12);
    doc.text(`Date de paiement : ${data.paymentDate || '-'}`, 50, top + 36);
    doc.text(`Mode de paiement : ${data.method || '-'}`, 50, top + 60);

    doc.moveDown(7);
    doc
      .fontSize(14)
      .fillColor('#16a34a')
      .text('LOYER ACQUITTÉ', { align: 'center' });

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end();
    });
  }
}
