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

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#111827';
    const mutedColor = '#4b5563';
    const accentColor = '#dc2626';

    const sectionTitle = (title: string) => {
      doc
        .moveDown(0.8)
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(primaryColor)
        .text(title, { underline: false });
      doc.moveDown(0.3);
    };

    const paragraph = (text: string) => {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(mutedColor)
        .text(text, {
          align: 'justify',
          lineGap: 3,
        });
      doc.moveDown(0.5);
    };

    const bullet = (text: string) => {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(mutedColor)
        .text(`• ${text}`, {
          indent: 10,
          lineGap: 3,
        });
    };

    // HEADER
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(primaryColor)
      .text('Contrat d’abonnement SunuSuite', {
        align: 'center',
      });

    doc
      .moveDown(0.3)
      .font('Helvetica')
      .fontSize(11)
      .fillColor(accentColor)
      .text('Plateforme de gestion professionnelle multi-activité', {
        align: 'center',
      });

    doc.moveDown(1.2);

    // INFOS CLIENT
    sectionTitle('1. Informations du client');

    doc.font('Helvetica').fontSize(11).fillColor(primaryColor);
    doc.text(`Entreprise : ${data.companyName}`);
    doc.text(`Responsable / Manager : ${data.managerName}`);
    doc.text(`Email : ${data.email}`);
    doc.text(`Téléphone : ${data.phone}`);

    // INFOS ABONNEMENT
    sectionTitle('2. Détails de l’abonnement');

    doc.font('Helvetica').fontSize(11).fillColor(primaryColor);
    doc.text(`Plan souscrit : ${data.planName}`);
    doc.text(`Montant : ${data.amount}`);
    doc.text(`Date de début : ${data.startDate}`);
    doc.text(`Date de fin : ${data.endDate}`);

    // IDENTIFIANTS
    sectionTitle('3. Accès à la plateforme');

    doc.font('Helvetica').fontSize(11).fillColor(primaryColor);
    doc.text(`Login : ${data.loginEmail}`);
    doc.text(`Mot de passe provisoire : ${data.temporaryPassword}`);
    doc.moveDown(0.4);

    paragraph(
      'Le client reconnaît avoir reçu des identifiants de connexion provisoires. Pour des raisons de sécurité, le mot de passe doit être modifié lors de la première connexion à la plateforme.'
    );

    // OBJET
    sectionTitle('4. Objet du contrat');

    paragraph(
      'Le présent document confirme la souscription du client à la plateforme SunuSuite pour la durée indiquée ci-dessus. SunuSuite met à disposition du client un accès à la solution correspondant au plan choisi, afin de lui permettre d’utiliser les fonctionnalités liées à son activité.'
    );

    // ACTIVATION
    sectionTitle('5. Conditions d’activation du compte');

    bullet(
      'L’accès à la plateforme est activé après validation de la demande et confirmation du paiement par SunuSuite.'
    );
    bullet(
      'Les identifiants de connexion sont transmis au responsable indiqué dans la demande.'
    );
    bullet(
      'L’abonnement prend effet à compter de la date de début figurant dans le présent contrat.'
    );
    doc.moveDown(0.5);

    // PAIEMENT
    sectionTitle('6. Conditions de paiement');

    bullet(
      'Le client s’engage à régler le montant correspondant au plan souscrit selon les modalités prévues par SunuSuite.'
    );
    bullet(
      'Toute activation ou tout renouvellement d’abonnement est conditionné à la réception et à la validation du paiement.'
    );
    bullet(
      'En cas de défaut de paiement, de paiement incomplet ou de litige sur le règlement, SunuSuite se réserve le droit de suspendre temporairement ou définitivement l’accès au service.'
    );
    doc.moveDown(0.5);

    // EXPIRATION
    sectionTitle('7. Durée et expiration de l’abonnement');

    paragraph(
      'L’abonnement est valable pour la période mentionnée dans le présent contrat. À l’expiration de cette période, l’accès au service peut être restreint, suspendu ou désactivé jusqu’au renouvellement de l’abonnement par le client.'
    );

    // SUSPENSION / RESILIATION
    sectionTitle('8. Suspension et résiliation');

    bullet(
      'SunuSuite peut suspendre un compte en cas de non-paiement, d’utilisation abusive, frauduleuse ou contraire aux conditions d’utilisation.'
    );
    bullet(
      'Toute tentative d’accès non autorisé, de partage illicite des accès ou d’usage portant atteinte à la sécurité de la plateforme peut entraîner une suspension immédiate.'
    );
    bullet(
      'En cas de résiliation ou de suspension, certaines fonctionnalités peuvent être désactivées sans préavis.'
    );
    doc.moveDown(0.5);

    // RESPONSABILITE
    sectionTitle('9. Responsabilité');

    paragraph(
      'SunuSuite s’engage à fournir un service accessible et sécurisé dans la mesure du raisonnable. Le client demeure seul responsable des informations, opérations et données qu’il saisit ou exploite sur la plateforme. SunuSuite ne saurait être tenu responsable d’une mauvaise utilisation du service par le client ou ses collaborateurs.'
    );

    // DONNEES
    sectionTitle('10. Données et confidentialité');

    paragraph(
      'Les données enregistrées sur la plateforme restent la propriété du client. SunuSuite met en œuvre les mesures nécessaires pour protéger les données hébergées et s’engage à ne pas les céder ni les revendre à des tiers sans autorisation.'
    );

    // ACCEPTATION
    sectionTitle('11. Acceptation des conditions');

    paragraph(
      'En utilisant la plateforme SunuSuite après activation de son compte, le client reconnaît avoir pris connaissance des présentes conditions et les accepter sans réserve.'
    );

    doc.moveDown(1.2);

    // SIGNATURE / FOOTER
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(primaryColor)
      .text(`Fait le : ${data.startDate}`, { align: 'right' });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(primaryColor)
      .text('Par SunuSuite', { align: 'right' });

    doc.moveDown(1);

    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor('#6b7280')
      .text(
        'Document généré automatiquement par SunuSuite. Ce contrat est valable sans signature manuscrite sauf disposition contraire prévue entre les parties.',
        {
          align: 'center',
        }
      );

    doc.end();
  });
}}
