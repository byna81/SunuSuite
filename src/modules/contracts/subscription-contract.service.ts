import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class SubscriptionContractService {
  async generateContract(data: {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    planName: string;
    sector: string;
    billingCycle: string;
    amount: number;
    startDate: Date;
    paymentMethod?: string;
    paymentReference?: string;
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: Uint8Array[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text('CONTRAT D’ABONNEMENT', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Activité : ${data.businessName}`);
      doc.text(`Responsable : ${data.ownerName}`);
      doc.text(`Email : ${data.email}`);
      doc.text(`Téléphone : ${data.phone}`);
      doc.moveDown();

      doc.text(`Plan : ${data.planName}`);
      doc.text(`Secteur : ${data.sector}`);
      doc.text(`Type : ${data.billingCycle}`);
      doc.text(`Montant : ${data.amount} XOF`);
      doc.moveDown();

      doc.text(`Date début : ${data.startDate.toLocaleDateString()}`);
      doc.moveDown();

      doc.text(`Paiement : ${data.paymentMethod || '-'}`);
      doc.text(`Référence : ${data.paymentReference || '-'}`);
      doc.moveDown();

      doc.text('Conditions :');
      doc.text('- Abonnement non remboursable');
      doc.text('- Accès soumis à validité de paiement');
      doc.text('- SunuSuite se réserve le droit de suspendre en cas de non paiement');

      doc.moveDown();
      doc.text('SunuSuite', { align: 'right' });

      doc.end();
    });
  }
}
