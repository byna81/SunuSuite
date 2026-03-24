import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  generateNoticePdf(data: any): Buffer {
    const doc = new PDFDocument();
    const buffers: any[] = [];

    doc.on('data', buffers.push.bind(buffers));

    doc.on('end', () => {});

    // HEADER
    doc.fontSize(20).text('AVIS D’ÉCHÉANCE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Agence : ${data.agency}`);
    doc.text(`Locataire : ${data.tenant}`);
    doc.text(`Bien : ${data.property}`);
    doc.text(`Période : ${data.period}`);
    doc.moveDown();

    doc.text(`Montant à payer : ${data.amountDue} FCFA`);
    doc.text(`Reste à payer : ${data.remaining} FCFA`);
    doc.text(`Date d'échéance : ${data.dueDate}`);
    doc.moveDown();

    doc.text(`Merci de procéder au règlement.`);

    doc.end();

    return Buffer.concat(buffers);
  }

  generateReceiptPdf(data: any): Buffer {
    const doc = new PDFDocument();
    const buffers: any[] = [];

    doc.on('data', buffers.push.bind(buffers));

    doc.on('end', () => {});

    doc.fontSize(20).text('QUITTANCE DE LOYER', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Agence : ${data.agency}`);
    doc.text(`Locataire : ${data.tenant}`);
    doc.text(`Bien : ${data.property}`);
    doc.text(`Période : ${data.period}`);
    doc.moveDown();

    doc.text(`Montant payé : ${data.amountPaid} FCFA`);
    doc.text(`Date de paiement : ${data.paymentDate}`);
    doc.text(`Mode de paiement : ${data.method}`);
    doc.moveDown();

    doc.text(`Loyer acquitté.`, { align: 'center' });

    doc.end();

    return Buffer.concat(buffers);
  }
}
