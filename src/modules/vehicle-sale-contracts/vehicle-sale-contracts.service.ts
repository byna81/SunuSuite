import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as Print from 'pdfkit';

function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

@Injectable()
export class VehicleSaleContractsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicleSaleContract.findMany({
      where: { tenantId },
      include: {
        vehicle: true,
        customer: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.vehicleSaleContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vehicle: true,
        customer: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!item) {
      throw new BadRequestException('Contrat de vente introuvable');
    }

    return item;
  }

  async create(
    tenantId: string,
    body: {
      vehicleId: string;
      customerId: string;
      saleDate?: string;
      salePrice: number;
      downPayment?: number;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
    },
  ) {
    if (!body.vehicleId) {
      throw new BadRequestException('Le véhicule est obligatoire');
    }

    if (!body.customerId) {
      throw new BadRequestException('Le client est obligatoire');
    }

    const salePrice = Number(body.salePrice || 0);
    const downPayment = Number(body.downPayment || 0);

    if (salePrice <= 0) {
      throw new BadRequestException('Le prix de vente doit être supérieur à 0');
    }

    if (downPayment < 0) {
      throw new BadRequestException("L'avance ne peut pas être négative");
    }

    if (downPayment > salePrice) {
      throw new BadRequestException(
        "L'avance ne peut pas dépasser le prix de vente",
      );
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: body.vehicleId,
        tenantId,
      },
    });

    if (!vehicle) {
      throw new BadRequestException('Véhicule introuvable');
    }

    const customer = await this.prisma.vehicleCustomer.findFirst({
      where: {
        id: body.customerId,
        tenantId,
      },
    });

    if (!customer) {
      throw new BadRequestException('Client introuvable');
    }

    const remainingAmount = salePrice - downPayment;
    const status = remainingAmount <= 0 ? 'solde' : 'actif';

    const contract = await this.prisma.vehicleSaleContract.create({
      data: {
        tenantId,
        vehicleId: body.vehicleId,
        customerId: body.customerId,
        saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
        salePrice,
        downPayment,
        amountPaid: downPayment,
        remainingAmount,
        status,
        paymentMethod: body.paymentMethod?.trim() || null,
        reference: body.reference?.trim() || null,
        notes: body.notes?.trim() || null,
      },
      include: {
        vehicle: true,
        customer: true,
        payments: true,
      },
    });

    if (downPayment > 0) {
      await this.prisma.vehiclePayment.create({
        data: {
          tenantId,
          paymentType: 'sale',
          saleContractId: contract.id,
          amount: downPayment,
          paymentMethod: body.paymentMethod?.trim() || 'non_precise',
          reference: body.reference?.trim() || null,
          note: "Paiement initial à la création du contrat",
          paidAt: body.saleDate ? new Date(body.saleDate) : new Date(),
        },
      });
    }

    await this.prisma.vehicle.update({
      where: { id: body.vehicleId },
      data: {
        status: remainingAmount <= 0 ? 'vendu' : 'indisponible',
      },
    });

    return this.findOne(tenantId, contract.id);
  }

  async addPayment(
    tenantId: string,
    id: string,
    body: {
      amount: number;
      paymentMethod: string;
      reference?: string;
      note?: string;
      paidAt?: string;
    },
  ) {
    const contract = await this.prisma.vehicleSaleContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vehicle: true,
      },
    });

    if (!contract) {
      throw new BadRequestException('Contrat de vente introuvable');
    }

    const amount = Number(body.amount || 0);

    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    if (!body.paymentMethod?.trim()) {
      throw new BadRequestException('Le moyen de paiement est obligatoire');
    }

    const nextAmountPaid = Number(contract.amountPaid || 0) + amount;

    if (nextAmountPaid > Number(contract.salePrice || 0)) {
      throw new BadRequestException(
        'Le paiement dépasse le montant restant du contrat',
      );
    }

    const remainingAmount = Number(contract.salePrice || 0) - nextAmountPaid;
    const status = remainingAmount <= 0 ? 'solde' : 'actif';

    await this.prisma.vehiclePayment.create({
      data: {
        tenantId,
        paymentType: 'sale',
        saleContractId: contract.id,
        amount,
        paymentMethod: body.paymentMethod.trim(),
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      },
    });

    await this.prisma.vehicleSaleContract.update({
      where: { id: contract.id },
      data: {
        amountPaid: nextAmountPaid,
        remainingAmount,
        status,
      },
    });

    if (remainingAmount <= 0) {
      await this.prisma.vehicle.update({
        where: { id: contract.vehicleId },
        data: {
          status: 'vendu',
        },
      });
    }

    return this.findOne(tenantId, contract.id);
  }

  async buildReceiptHtml(tenantId: string, id: string) {
    const contract = await this.prisma.vehicleSaleContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        tenant: true,
        vehicle: true,
        customer: true,
        payments: {
          orderBy: { paidAt: 'asc' },
        },
      },
    });

    if (!contract) {
      throw new BadRequestException('Contrat de vente introuvable');
    }

    const tenantName = contract.tenant?.name || 'SunuSuite';
    const tenantAddress = contract.tenant?.address || '';
    const tenantPhone = contract.tenant?.phone || '';
    const tenantEmail = contract.tenant?.email || '';
    const tenantCurrency = contract.tenant?.currency || 'FCFA';

    const money = (value: number) =>
      `${Number(value || 0).toLocaleString('fr-FR')} ${tenantCurrency}`;

    const saleCode = `VENTE-${String(contract.id).replace(/-/g, '').slice(-8).toUpperCase()}`;

    const saleDate = new Date(contract.saleDate).toLocaleDateString('fr-FR');

    const vehicleLabel = [
      contract.vehicle?.brand || '',
      contract.vehicle?.model || '',
      contract.vehicle?.year ? `(${contract.vehicle.year})` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const paymentRows = contract.payments.length
      ? contract.payments
          .map(
            (payment) => `
              <tr>
                <td>${escapeHtml(
                  new Date(payment.paidAt).toLocaleDateString('fr-FR'),
                )}</td>
                <td>${escapeHtml(payment.paymentMethod || '-')}</td>
                <td>${escapeHtml(payment.reference || '-')}</td>
                <td class="amount">${escapeHtml(money(payment.amount))}</td>
              </tr>
            `,
          )
          .join('')
      : `
        <tr>
          <td colspan="4" class="empty">Aucun paiement enregistré</td>
        </tr>
      `;

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
          />
          <style>
            @page {
              size: A4;
              margin: 22mm 16mm;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #111827;
              background: #ffffff;
            }

            .page {
              width: 100%;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              margin-bottom: 24px;
            }

            .brand {
              max-width: 62%;
            }

            .brand-name {
              font-size: 30px;
              font-weight: 800;
              margin: 0 0 8px 0;
              color: #111827;
            }

            .brand-meta {
              font-size: 13px;
              color: #4b5563;
              margin: 3px 0;
              line-height: 1.4;
            }

            .doc-box {
              min-width: 220px;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 16px;
              background: #f9fafb;
            }

            .doc-title {
              font-size: 22px;
              font-weight: 800;
              margin: 0 0 8px 0;
              text-align: right;
              color: #111827;
            }

            .doc-meta {
              font-size: 13px;
              color: #374151;
              margin: 4px 0;
              text-align: right;
            }

            .section {
              margin-top: 18px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 16px;
            }

            .section-title {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 12px 0;
              color: #111827;
            }

            .two-cols {
              display: flex;
              gap: 18px;
            }

            .col {
              flex: 1;
            }

            .line {
              font-size: 14px;
              color: #374151;
              margin: 7px 0;
              line-height: 1.5;
              word-break: break-word;
            }

            .label {
              font-weight: 700;
              color: #111827;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-top: 4px;
            }

            .summary-card {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 14px;
              background: #f9fafb;
            }

            .summary-label {
              font-size: 13px;
              color: #6b7280;
              margin: 0 0 6px 0;
            }

            .summary-value {
              font-size: 20px;
              font-weight: 800;
              color: #111827;
              margin: 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
            }

            th {
              text-align: left;
              font-size: 13px;
              font-weight: 800;
              color: #111827;
              border-bottom: 1px solid #e5e7eb;
              padding: 10px 8px;
              background: #f9fafb;
            }

            td {
              font-size: 13px;
              color: #374151;
              border-bottom: 1px solid #f3f4f6;
              padding: 10px 8px;
              vertical-align: top;
            }

            td.amount,
            th.amount {
              text-align: right;
            }

            .empty {
              text-align: center;
              color: #6b7280;
              padding: 18px 8px;
            }

            .note-box {
              margin-top: 14px;
              padding: 14px;
              border-radius: 14px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              font-size: 13px;
              color: #374151;
              line-height: 1.55;
              white-space: pre-wrap;
            }

            .signatures {
              display: flex;
              justify-content: space-between;
              gap: 30px;
              margin-top: 34px;
            }

            .signature-box {
              flex: 1;
              text-align: center;
            }

            .signature-line {
              margin-top: 48px;
              border-top: 1px solid #9ca3af;
              padding-top: 8px;
              font-size: 13px;
              color: #374151;
            }

            .footer {
              margin-top: 24px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <p class="brand-name">${escapeHtml(tenantName)}</p>
                ${
                  tenantAddress
                    ? `<p class="brand-meta">${escapeHtml(tenantAddress)}</p>`
                    : ''
                }
                ${
                  tenantPhone
                    ? `<p class="brand-meta">Tél : ${escapeHtml(tenantPhone)}</p>`
                    : ''
                }
                ${
                  tenantEmail
                    ? `<p class="brand-meta">Email : ${escapeHtml(tenantEmail)}</p>`
                    : ''
                }
              </div>

              <div class="doc-box">
                <p class="doc-title">Facture / Reçu</p>
                <p class="doc-meta">Code : ${escapeHtml(saleCode)}</p>
                <p class="doc-meta">Date de vente : ${escapeHtml(saleDate)}</p>
                <p class="doc-meta">Statut : ${escapeHtml(contract.status)}</p>
              </div>
            </div>

            <div class="section">
              <p class="section-title">Client et véhicule</p>

              <div class="two-cols">
                <div class="col">
                  <p class="line"><span class="label">Client :</span> ${escapeHtml(
                    contract.customer?.fullName || '-',
                  )}</p>
                  <p class="line"><span class="label">Téléphone :</span> ${escapeHtml(
                    contract.customer?.phone || '-',
                  )}</p>
                  <p class="line"><span class="label">Email :</span> ${escapeHtml(
                    contract.customer?.email || '-',
                  )}</p>
                  <p class="line"><span class="label">Adresse :</span> ${escapeHtml(
                    contract.customer?.address || '-',
                  )}</p>
                </div>

                <div class="col">
                  <p class="line"><span class="label">Véhicule :</span> ${escapeHtml(
                    vehicleLabel || '-',
                  )}</p>
                  <p class="line"><span class="label">Immatriculation :</span> ${escapeHtml(
                    contract.vehicle?.registrationNumber || '-',
                  )}</p>
                  <p class="line"><span class="label">Couleur :</span> ${escapeHtml(
                    contract.vehicle?.color || '-',
                  )}</p>
                  <p class="line"><span class="label">Kilométrage :</span> ${escapeHtml(
                    contract.vehicle?.mileage
                      ? `${Number(contract.vehicle.mileage).toLocaleString('fr-FR')} km`
                      : '-',
                  )}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <p class="section-title">Résumé financier</p>

              <div class="summary-grid">
                <div class="summary-card">
                  <p class="summary-label">Prix de vente</p>
                  <p class="summary-value">${escapeHtml(
                    money(contract.salePrice),
                  )}</p>
                </div>

                <div class="summary-card">
                  <p class="summary-label">Avance initiale</p>
                  <p class="summary-value">${escapeHtml(
                    money(contract.downPayment),
                  )}</p>
                </div>

                <div class="summary-card">
                  <p class="summary-label">Total payé</p>
                  <p class="summary-value">${escapeHtml(
                    money(contract.amountPaid),
                  )}</p>
                </div>

                <div class="summary-card">
                  <p class="summary-label">Reste à payer</p>
                  <p class="summary-value">${escapeHtml(
                    money(contract.remainingAmount),
                  )}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <p class="section-title">Historique des paiements</p>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Moyen</th>
                    <th>Référence</th>
                    <th class="amount">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentRows}
                </tbody>
              </table>

              ${
                contract.notes
                  ? `<div class="note-box"><span class="label">Notes :</span><br />${escapeHtml(
                      contract.notes,
                    )}</div>`
                  : ''
              }
            </div>

            <div class="signatures">
              <div class="signature-box">
                <div class="signature-line">Signature vendeur</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Signature client</div>
              </div>
            </div>

            <div class="footer">
              Document généré par SunuSuite
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
