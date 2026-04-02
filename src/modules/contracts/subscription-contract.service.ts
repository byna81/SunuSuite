import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

interface ContractData {
  companyName: string;
  managerName: string;
  email: string;
  phone: string;
  planName: string;
  amount: string;
  startDate: string;
  endDate: string;
  loginEmail: string;
  temporaryPassword: string;
}

@Injectable()
export class SubscriptionContractService {
  async generateSubscriptionContractPdf(data: ContractData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Contrat d’abonnement SunuSuite', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Entreprise : ${data.companyName}`);
      doc.text(`Manager : ${data.managerName}`);
      doc.text(`Email : ${data.email}`);
      doc.text(`Téléphone : ${data.phone}`);
      doc.moveDown();

      doc.text(`Plan souscrit : ${data.planName}`);
      doc.text(`Montant : ${data.amount}`);
      doc.text(`Date de début : ${data.startDate}`);
      doc.text(`Date de fin : ${data.endDate}`);
      doc.moveDown();

      doc.text('Identifiants de connexion');
      doc.text(`Login : ${data.loginEmail}`);
      doc.text(`Mot de passe provisoire : ${data.temporaryPassword}`);
      doc.moveDown();

      doc.text(
        'Ce document confirme la souscription du client à la plateforme SunuSuite et l’activation de son accès administrateur.',
        { align: 'justify' },
      );

      doc.moveDown(2);
      doc.text('Fait par SunuSuite', { align: 'right' });

      doc.end();
    });
  }
}
