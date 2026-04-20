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
    return date.toLocaleDateString('fr-FR');
  }

  private formatMoney(value?: number | null) {
    return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
  }

  private safe(value?: string | null) {
    return value?.trim() || '-';
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

    const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
    this.ensureDirectoryExists(uploadsDir);

    const fileName = `lease-contract-${contract.id}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const ownerName = this.safe(contract.property?.owner?.name);
    const ownerAddress = this.safe(contract.property?.owner?.address);
    const ownerPhone = this.safe(contract.property?.owner?.phone);

    const tenantName = this.safe(contract.tenantProperty?.name);
    const tenantPhone = this.safe(contract.tenantProperty?.phone);
    const tenantIdentityNumber = this.safe(contract.tenantProperty?.identityNumber);
    const tenantAddress = this.safe(contract.tenantProperty?.address);

    const propertyTitle = this.safe(contract.property?.title);
    const propertyAddress = this.safe(contract.property?.address);
    const propertyType = this.safe(contract.property?.type);

    const startDate = this.formatDate(contract.startDate);
    const endDate = contract.endDate ? this.formatDate(contract.endDate) : 'Non définie';
    const signatureDate = this.formatDate(new Date());

    const rentAmount = this.formatMoney(contract.rentAmount);
    const depositAmount = this.formatMoney(contract.depositAmount);
    const city = this.safe(contract.property?.city || 'Dakar');

    const paymentFrequency = this.safe(contract.paymentFrequency || 'mensuel');
    const notes = this.safe(contract.notes);

    const line = () => {
      doc.moveDown(0.3);
      doc
        .strokeColor('#d1d5db')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();
      doc.moveDown(0.6);
    };

    const sectionTitle = (title: string) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#111827')
        .text(title, { align: 'left' });
      doc.moveDown(0.4);
    };

    const paragraph = (text: string) => {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#374151')
        .text(text, {
          align: 'justify',
          lineGap: 2,
        });
      doc.moveDown(0.6);
    };

    const bullet = (text: string) => {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#374151')
        .text(`• ${text}`, {
          indent: 10,
          lineGap: 2,
        });
    };

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#111827')
      .text('CONTRAT DE BAIL A USAGE D’HABITATION', {
        align: 'center',
      });

    doc.moveDown(1);

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#374151')
      .text('Entre les soussignés :');

    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').fillColor('#111827').text('Le Bailleur');
    doc.font('Helvetica').fillColor('#374151');
    doc.text(`Nom : ${ownerName}`);
    doc.text(`Adresse : ${ownerAddress}`);
    doc.text(`Téléphone : ${ownerPhone}`);

    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').fillColor('#111827').text('Le Locataire');
    doc.font('Helvetica').fillColor('#374151');
    doc.text(`Nom : ${tenantName}`);
    doc.text(`Adresse : ${tenantAddress}`);
    doc.text(`Téléphone : ${tenantPhone}`);
    doc.text(`Pièce d’identité : ${tenantIdentityNumber}`);

    line();

    sectionTitle('1. Objet du contrat');
    paragraph(
      `Le présent contrat porte sur la location du bien suivant : ${propertyType} - ${propertyTitle}, situé à l’adresse ${propertyAddress}. Le locataire déclare avoir visité le bien et l’accepter dans l’état où il se trouve au jour de la signature du présent contrat.`,
    );

    sectionTitle('2. Destination');
    paragraph(
      `Le bien est loué exclusivement à usage d’habitation. Toute utilisation à des fins professionnelles, commerciales ou contraires à la destination initiale du bien est interdite sauf accord écrit préalable du bailleur.`,
    );

    sectionTitle('3. Durée');
    paragraph(
      `Le présent bail prend effet à compter du ${startDate} et est conclu jusqu’au ${endDate}. À défaut de congé régulièrement donné par l’une des parties, il pourra être renouvelé selon les conditions légales et contractuelles applicables.`,
    );

    sectionTitle('4. Conditions financières');
    paragraph(
      `Le loyer est fixé à ${rentAmount}, payable selon une périodicité ${paymentFrequency}. Le paiement doit intervenir au plus tard le 5 de chaque mois, par l’un des moyens acceptés par le bailleur.`,
    );

    bullet('Espèces');
    bullet('Wave');
    bullet('Orange Money');
    bullet('Virement bancaire');

    doc.moveDown(0.8);

    sectionTitle('5. Caution');
    paragraph(
      `Le locataire verse une caution de ${depositAmount}. Cette caution est destinée à couvrir les dégradations éventuelles, les loyers impayés ou les charges restant dues. Elle sera restituée après l’état des lieux de sortie, sous réserve des retenues légalement ou contractuellement justifiées.`,
    );

    sectionTitle('6. Obligations du locataire');
    bullet('Payer régulièrement le loyer et les charges dues.');
    bullet('User paisiblement du bien loué et respecter le voisinage.');
    bullet('Entretenir les lieux et prendre en charge les réparations locatives.');
    bullet('Ne pas sous-louer sans l’accord écrit du bailleur.');
    bullet('Répondre des dégradations survenues pendant l’occupation.');
    doc.moveDown(0.8);

    sectionTitle('7. Charges et entretien');
    paragraph(
      `Les consommations d’eau, d’électricité, d’internet et toutes autres charges liées à l’usage courant du bien sont à la charge du locataire. Les grosses réparations, sauf faute du locataire, restent à la charge du bailleur.`,
    );

    sectionTitle('8. Résiliation');
    paragraph(
      `En cas de non-paiement du loyer, de manquement grave aux obligations contractuelles ou de trouble manifeste, le bail pourra être résilié dans les conditions prévues par la réglementation applicable et après mise en demeure restée sans effet.`,
    );

    sectionTitle('9. Assurance et responsabilité');
    paragraph(
      `Le locataire demeure responsable des dommages causés au bien pendant la durée du bail. Il lui est recommandé de souscrire une assurance couvrant au minimum les risques locatifs.`,
    );

    sectionTitle('10. Juridiction compétente');
    paragraph(
      `Tout litige relatif à l’exécution, l’interprétation ou la résiliation du présent contrat sera soumis aux juridictions compétentes de ${city}.`,
    );

    if (notes !== '-') {
      sectionTitle('11. Clauses particulières');
      paragraph(notes);
    }

    line();

    doc.font('Helvetica').fontSize(11).fillColor('#374151');
    doc.text(`Fait à : ${city}`);
    doc.text(`Le : ${signatureDate}`);

    doc.moveDown(2);

    const signatureTop = doc.y;

    doc.font('Helvetica-Bold').fillColor('#111827');
    doc.text('LE BAILLEUR', 70, signatureTop);
    doc.text('LE LOCATAIRE', 360, signatureTop);

    doc.moveDown(4);

    doc.font('Helvetica').fillColor('#6b7280');
    doc.text('(Signature)', 85, signatureTop + 90);
    doc.text('(Signature)', 380, signatureTop + 90);

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return `/uploads/contracts/${fileName}`;
  }
}
