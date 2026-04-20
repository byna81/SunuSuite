import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');

@Injectable()
export class RealEstateContractPdfService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private formatDate(value?: Date | string | null) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
  }

  private formatMoney(value?: number | null) {
    return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
  }

  private safe(value?: string | null) {
    return value?.trim() || '-';
  }

  private pickFirstString(...values: Array<unknown>) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private normalizeParagraph(value?: string | null) {
    const text = this.safe(value);
    if (text === '-') return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  private async getAgencyInfo(tenantId: string) {
    let settings: any = null;

    try {
      settings = await (this.prisma as any).appSettings?.findFirst?.({
        where: { tenantId },
      });
    } catch {
      settings = null;
    }

    const agencyName = this.pickFirstString(
      settings?.realEstateAgencyName,
      settings?.agencyName,
      settings?.companyName,
      settings?.businessName,
      settings?.name,
    );

    const agencyAddress = this.pickFirstString(
      settings?.realEstateAgencyAddress,
      settings?.agencyAddress,
      settings?.companyAddress,
      settings?.address,
      settings?.location,
    );

    const agencyPhone = this.pickFirstString(
      settings?.realEstateAgencyPhone,
      settings?.agencyPhone,
      settings?.companyPhone,
      settings?.phone,
      settings?.mobile,
    );

    const agencyActivity = this.pickFirstString(
      settings?.realEstateAgencyActivity,
      settings?.agencyActivity,
      settings?.businessActivity,
      'Achat - Vente - Location - Gérance',
    );

    return {
      agencyName: agencyName || 'Agence immobilière',
      agencyAddress: agencyAddress || '-',
      agencyPhone: agencyPhone || '-',
      agencyActivity,
    };
  }

  private drawSeparator(doc: PDFKit.PDFDocument) {
    doc.moveDown(0.25);
    doc
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(0.6);
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text(title, { align: 'left' });
    doc.moveDown(0.35);
  }

  private paragraph(doc: PDFKit.PDFDocument, text: string) {
    if (!text.trim()) return;
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#374151')
      .text(text, {
        align: 'justify',
        lineGap: 2,
      });
    doc.moveDown(0.5);
  }

  private bullet(doc: PDFKit.PDFDocument, text: string) {
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#374151')
      .text(`• ${text}`, {
        indent: 10,
        lineGap: 2,
      });
  }

  private ensureSpace(doc: PDFKit.PDFDocument, minY = 720) {
    if (doc.y > minY) {
      doc.addPage();
    }
  }

  async generateLeaseContractPdf(contractId: string): Promise<string> {
    const contract = await this.prisma.leaseContract.findUnique({
      where: { id: contractId },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
    }

    const { agencyName, agencyAddress, agencyPhone, agencyActivity } =
      await this.getAgencyInfo(contract.tenantId);

    const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
    this.ensureDirectoryExists(uploadsDir);

    const fileName = `lease-contract-${contract.id}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const ownerName = this.safe(contract.property?.owner?.name);
    const ownerAddress = this.safe(contract.property?.owner?.address);
    const ownerPhone = this.safe(contract.property?.owner?.phone);

    const tenantName = this.safe(contract.tenantProperty?.name);
    const tenantPhone = this.safe(contract.tenantProperty?.phone);
    const tenantIdentityNumber = '-';
    const tenantAddress = this.safe(contract.tenantProperty?.address);

    const propertyTitle = this.safe(contract.property?.title);
    const propertyAddress = this.safe(contract.property?.address);
    const propertyType = this.safe(contract.property?.type);

    const startDate = this.formatDate(contract.startDate);
    const endDate = contract.endDate
      ? this.formatDate(contract.endDate)
      : 'Non définie';
    const signatureDate = this.formatDate(new Date());

    const rentAmount = this.formatMoney(contract.rentAmount);
    const depositAmount = this.formatMoney(contract.depositAmount);
    const city = this.safe(contract.property?.city);

    const notes = this.normalizeParagraph(contract.notes);

    // En-tête agence
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(agencyName);
    doc.font('Helvetica').fontSize(9.5).fillColor('#374151');
    doc.text(agencyAddress);
    doc.text(agencyActivity);
    doc.text(`Tel ${agencyPhone}`);

    doc.moveDown(1);

    // Titre
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#111827')
      .text('Contrat de bail', { align: 'center' });

    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Entre les soussignés');
    doc.moveDown(0.3);

    doc
      .font('Helvetica')
      .fontSize(10.2)
      .fillColor('#374151')
      .text(
        `M. ${ownerName}, propriétaire de l’immeuble situé à ${propertyAddress}, représenté par ${agencyName}, en qualité de bailleur ;`,
        {
          align: 'justify',
          lineGap: 2,
        },
      );

    doc.moveDown(0.35);

    doc.text(
      `Et M./Mme ${tenantName}, demeurant à ${tenantAddress}, téléphone ${tenantPhone}, pièce d’identité ${tenantIdentityNumber}, ci-après désigné(e) le locataire ;`,
      {
        align: 'justify',
        lineGap: 2,
      },
    );

    doc.moveDown(0.45);
    doc.text('Il a été convenu et arrêté ce qui suit :', {
      align: 'center',
    });

    doc.moveDown(0.7);

    this.sectionTitle(doc, '1-Désignation');
    this.paragraph(
      doc,
      `Le présent contrat porte sur un ${propertyType.toUpperCase()} dénommé "${propertyTitle}" situé à ${propertyAddress}, que le preneur a visité et accepté tel quel est.`,
    );

    this.sectionTitle(doc, '2-Usage durée');
    this.paragraph(doc, 'Le local est loué strictement à usage d’habitation.');
    this.paragraph(
      doc,
      `Le présent contrat de bail est conclu à compter du ${startDate}${
        endDate !== 'Non définie' ? ` jusqu’au ${endDate}` : ''
      } et pourra être renouvelé ou révisé selon les dispositions applicables.`,
    );

    this.sectionTitle(doc, '3-charges et condition liées au contrat');
    this.paragraph(
      doc,
      `La présente location est consentie et acceptée sous les charges ordinaires et de droit suivant l’usage sur la place, outre les conditions suivantes que le locataire s’oblige à exécuter ou à supporter à peine de résiliation, sans pouvoir prétendre à aucune indemnité, et sans aucun recours contre le bailleur.`,
    );

    this.paragraph(
      doc,
      `ART 1 : de prendre le bien loué dans l’état où il se trouvera le jour de l’entrée, étant précisé qu’un état des lieux sera effectué.`,
    );
    this.paragraph(
      doc,
      `ART 2 : de garnir et de tenir le local constamment pourvu de meubles, mobilier et matériel ou autre en quantité et de valeur suffisante pour répondre en tout temps du paiement des loyers et des charges, et condition de la location.`,
    );
    this.paragraph(
      doc,
      `ART 3 : de ne pas prêter ou sous louer le bien loué sans l’autorisation expresse et écrite du bailleur.`,
    );
    this.paragraph(
      doc,
      `ART 4 : d’entretenir le bien loué pendant toute la durée du bail des réparations locatives et de ne pouvoir, sans le consentement exprès et par écrit du bailleur, changer dans la disposition du bien loué.`,
    );
    this.paragraph(
      doc,
      `ART 5 : d’acquitter exactement pendant toute la durée de la location les frais d’enregistrement du compteur d’eau, d’électricité et de la consommation d’eau et d’électricité propre au bien loué ainsi que des contributions personnelles et mobilières enfin qu’aucun recours ne puisse être exercé contre le bailleur.`,
    );
    this.paragraph(
      doc,
      `ART 6 : de payer, s’il y a lieu, la taxe d’enlèvement des ordures ménagères, ainsi que toutes les autres taxes ou impôts locatifs futurs qui seraient inhérents au présent bail.`,
    );
    this.paragraph(
      doc,
      `ART 7 : de souffrir sans aucune indemnité ni diminution de loyer les travaux que le bailleur jugerait nécessaire de faire exécuter dans le bien loué ou dans l’immeuble.`,
    );
    this.paragraph(
      doc,
      `ART 8 : de satisfaire à toutes les charges de ville ou de police dont les locataires sont ordinairement tenus, de par la loi, sans qu’aucun recours ne puisse être exercé à cet égard contre le bailleur.`,
    );
    this.paragraph(
      doc,
      `ART 9 : de donner la possibilité au bailleur, lorsqu’un congé aura été reçu ou donné, de faire visiter le local par tout preneur potentiel, tous les jours ouvrables durant deux heures en étant prévenu à moins vingt-quatre heure avant chaque visite.`,
    );
    this.paragraph(
      doc,
      `ART 10 : de payer les frais d’enregistrement et de l’état des lieux et ceux afférent au présent contrat et notamment les frais de timbre et enregistrement y afférent, ainsi que toutes les amendes, pénalités ou double droit éventuels, sans recours contre le bailleur.`,
    );

    this.ensureSpace(doc);

    this.sectionTitle(doc, '4-caution');
    this.paragraph(
      doc,
      `De verser à l’entrée dans le bien une caution de ${depositAmount} à titre de dépôt de garantie pour éventuel paiement des réparations locatives causées par le locataire et en particulier :`,
    );
    this.bullet(doc, 'Le lessivage et la réfection des peintures');
    this.bullet(doc, 'Le lessivage du carrelage et des sanitaires');
    this.bullet(doc, 'Les vérifications des installations électriques');
    this.bullet(doc, 'La désinfection du local');
    this.bullet(
      doc,
      'Et en général toutes les réparations de détails qui s’en avéreraient nécessaires pour que le bien rendu soit à neuf',
    );
    doc.moveDown(0.6);

    this.sectionTitle(doc, '5-loyer');
    this.paragraph(
      doc,
      `Le présent bail est consenti moyennant mensuel de ${rentAmount}, payable avant le cinq (5) de chaque mois, loyer portable et non quérable. Tout mois entamé est dû. Il est expressément stipulé qu’en cas de retard dans le paiement du loyer, le locataire s’acquittera des frais qu’il aura été nécessaire de le relancer.`,
    );

    this.sectionTitle(doc, '6-Congé');
    this.paragraph(
      doc,
      `Le bailleur devra donner son préavis de six (6) mois au preneur par voie d’huissier ou lettre recommandée, s’il entend résilier le bail. Le locataire devra respecter un préavis de deux mois pour donner congé à l’autre partie, et ce par acte extrajudiciaire.`,
    );

    this.sectionTitle(doc, '7-clauses résolutoires');
    this.paragraph(
      doc,
      `À défaut de paiement d’un seul terme de loyer à son échéance huit jours après simple mise en demeure par acte extrajudiciaire adressé par le bailleur ou à son représentant et restée sans effet, la présente location sera résiliée de plein droit si le bailleur le décide, sans aucune formalité de justice, et le locataire sera expulsé sur simple ordonnance de référé.`,
    );

    this.sectionTitle(doc, '8 assurances');
    this.paragraph(
      doc,
      `Le preneur devra contracter auprès d’une compagnie d’assurance notoirement solvable, une police d’assurance incendie, et dégâts des eaux, les risques locatifs, le recours des voisins, couvrant la valeur au mois dont il est question à l’article ci-dessus.`,
    );

    this.sectionTitle(doc, '9-Clause particulière');
    this.paragraph(
      doc,
      notes ||
        `Il est expressément convenu qu’en cas de litige, soumis ou non à l’appréciation des tribunaux compétents, les frais d’huissier, l’expertise et les honoraires d’avocat, qui auraient été engagés et ce, sur pièces justificatives, seront remboursés par la partie qui aura perdu le procès.`,
    );

    this.sectionTitle(doc, 'Election de domicile et attribution de juridiction');
    this.paragraph(doc, `Le locataire élit domicile dans les lieux loués.`);
    this.paragraph(
      doc,
      `Le bailleur dans les bureaux de ${agencyName}. Avec attribution exclusive de juridiction aux tribunaux de ${city}.`,
    );

    this.paragraph(
      doc,
      `LE LOCATAIRE S’ENGAGE EXPRESSEMENT A REMETTRE AU BAILLEUR OU A SON MANDATAIRE LA PHOTOCOPIE DE SON CONTRAT D’ABONNEMENT D’ELECTRICITE HUIT JOUR A COMPTER DE LA PRISE EN JOUISSANCE DES LIEUX LOUES. LE LOCATAIRE DOIT EGALEMENT PRODUIRE A SA SORTIE LE QUITUS D’ELECTRICITE, D’EAU ET DE TELEPHONE.`,
    );

    this.paragraph(
      doc,
      `NB LES FRAIS DE VIDANGES DES FAUSSES SEPTIQUES SONT A LA CHARGE DES LOCATAIRES.`,
    );

    this.drawSeparator(doc);

    doc.font('Helvetica').fontSize(10.5).fillColor('#374151');
    doc.text(`${city.toUpperCase()} LE ${signatureDate}`, {
      align: 'right',
    });

    doc.moveDown(2.5);

    const signatureTop = doc.y;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827');
    doc.text('LE GERANT', 70, signatureTop);
    doc.text('le locataire', 390, signatureTop);

    doc.moveDown(5);

    doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
    doc.text('(Signature)', 70, signatureTop + 90);
    doc.text('(Signature)', 390, signatureTop + 90);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return `/uploads/contracts/${fileName}`;
  }
}
