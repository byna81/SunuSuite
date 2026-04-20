import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealEstateContractPdfService } from './real-estate-contract-pdf.service';

@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realEstateContractPdfService: RealEstateContractPdfService,
  ) {}

  private computeAmounts(rentAmount: number, agencyPercent: number) {
    const rent = Number(rentAmount || 0);
    const percent = Number(agencyPercent || 0);

    const agencyAmount = Number(((rent * percent) / 100).toFixed(2));
    const ownerAmount = Number((rent - agencyAmount).toFixed(2));

    return {
      agencyAmount,
      ownerAmount,
    };
  }

  async findAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    return this.prisma.leaseContract.findMany({
      where: { tenantId },
      include: {
        property: true,
        tenantProperty: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    const item = await this.prisma.leaseContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Contrat introuvable');
    }

    return item;
  }

  async create(
    tenantId: string,
    body: {
      propertyId: string;
      tenantPropertyId: string;
      startDate: string;
      endDate?: string;
      rentAmount: number;
      depositAmount?: number;
      paymentFrequency?: string;
      status?: string;
      agencyPercent?: number;
      notes?: string;
      inventoryInNotes?: string;
      inventoryOutNotes?: string;
    },
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!body.propertyId) {
      throw new BadRequestException('Le bien est obligatoire');
    }

    if (!body.tenantPropertyId) {
      throw new BadRequestException('Le locataire est obligatoire');
    }

    if (!body.startDate) {
      throw new BadRequestException('La date de début est obligatoire');
    }

    const rentAmount = Number(body.rentAmount || 0);
    const depositAmount = Number(body.depositAmount || 0);
    const agencyPercent = Number(body.agencyPercent || 0);

    if (rentAmount <= 0) {
      throw new BadRequestException('Le loyer doit être supérieur à 0');
    }

    if (agencyPercent < 0 || agencyPercent > 100) {
      throw new BadRequestException(
        'Le pourcentage agence doit être compris entre 0 et 100',
      );
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: body.propertyId,
        tenantId,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable');
    }

    const tenantProperty = await this.prisma.tenantProperty.findFirst({
      where: {
        id: body.tenantPropertyId,
        property: {
          tenantId,
        },
      },
    });

    if (!tenantProperty) {
      throw new NotFoundException('Locataire introuvable');
    }

    if (tenantProperty.propertyId !== property.id) {
      throw new BadRequestException(
        'Le locataire sélectionné n’est pas rattaché à ce bien',
      );
    }

    const { agencyAmount, ownerAmount } = this.computeAmounts(
      rentAmount,
      agencyPercent,
    );

    const contract = await this.prisma.leaseContract.create({
      data: {
        tenantId,
        propertyId: body.propertyId,
        tenantPropertyId: body.tenantPropertyId,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        rentAmount,
        depositAmount,
        paymentFrequency: body.paymentFrequency?.trim() || 'mensuel',
        status: body.status?.trim() || 'actif',
        agencyPercent,
        agencyAmount,
        ownerAmount,
        notes: body.notes?.trim() || null,
        inventoryInNotes: body.inventoryInNotes?.trim() || null,
        inventoryOutNotes: body.inventoryOutNotes?.trim() || null,
      },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });

    try {
      const pdfUrl =
        await this.realEstateContractPdfService.generateLeaseContractPdf(
          contract.id,
        );

      await this.prisma.leaseContract.update({
        where: { id: contract.id },
        data: {
          pdfUrl,
          pdfGeneratedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(
        'Erreur génération PDF contrat immobilier:',
        error,
      );
    }

    return this.prisma.leaseContract.findUnique({
      where: { id: contract.id },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    body: {
      startDate?: string;
      endDate?: string;
      rentAmount?: number;
      depositAmount?: number;
      paymentFrequency?: string;
      status?: string;
      agencyPercent?: number;
      notes?: string;
      inventoryInNotes?: string;
      inventoryOutNotes?: string;
    },
  ) {
    const existing = await this.prisma.leaseContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Contrat introuvable');
    }

    const rentAmount =
      body.rentAmount !== undefined
        ? Number(body.rentAmount)
        : existing.rentAmount;

    const agencyPercent =
      body.agencyPercent !== undefined
        ? Number(body.agencyPercent)
        : existing.agencyPercent;

    if (rentAmount <= 0) {
      throw new BadRequestException('Le loyer doit être supérieur à 0');
    }

    if (agencyPercent < 0 || agencyPercent > 100) {
      throw new BadRequestException(
        'Le pourcentage agence doit être compris entre 0 et 100',
      );
    }

    const { agencyAmount, ownerAmount } = this.computeAmounts(
      rentAmount,
      agencyPercent,
    );

    const updated = await this.prisma.leaseContract.update({
      where: { id },
      data: {
        startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
        endDate:
          body.endDate !== undefined
            ? body.endDate
              ? new Date(body.endDate)
              : null
            : existing.endDate,
        rentAmount,
        depositAmount:
          body.depositAmount !== undefined
            ? Number(body.depositAmount)
            : existing.depositAmount,
        paymentFrequency:
          body.paymentFrequency?.trim() || existing.paymentFrequency,
        status: body.status?.trim() || existing.status,
        agencyPercent,
        agencyAmount,
        ownerAmount,
        notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
        inventoryInNotes:
          body.inventoryInNotes !== undefined
            ? body.inventoryInNotes?.trim() || null
            : existing.inventoryInNotes,
        inventoryOutNotes:
          body.inventoryOutNotes !== undefined
            ? body.inventoryOutNotes?.trim() || null
            : existing.inventoryOutNotes,
      },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });

    try {
      const pdfUrl =
        await this.realEstateContractPdfService.generateLeaseContractPdf(
          updated.id,
        );

      await this.prisma.leaseContract.update({
        where: { id: updated.id },
        data: {
          pdfUrl,
          pdfGeneratedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(
        'Erreur régénération PDF contrat immobilier:',
        error,
      );
    }

    return this.prisma.leaseContract.findUnique({
      where: { id: updated.id },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        tenantProperty: true,
      },
    });
  }

  async terminate(tenantId: string, id: string) {
    const existing = await this.prisma.leaseContract.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Contrat introuvable');
    }

    return this.prisma.leaseContract.update({
      where: { id },
      data: {
        status: 'résilié',
        terminatedAt: new Date(),
      },
      include: {
        property: true,
        tenantProperty: true,
      },
    });
  }

  async findSmartOwnerPaymentData(tenantId: string, propertyId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId manquant');
    }

    if (!propertyId) {
      throw new BadRequestException('Le bien est obligatoire');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        tenantId,
      },
      include: {
        owner: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable');
    }

    const contract = await this.prisma.leaseContract.findFirst({
      where: {
        tenantId,
        propertyId,
        status: {
          in: ['actif', 'active', 'brouillon'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        tenantProperty: true,
      },
    });

    return {
      property: {
        id: property.id,
        title: property.title,
      },
      owner: property.owner
        ? {
            id: property.owner.id,
            name: property.owner.name,
          }
        : null,
      contract: contract
        ? {
            id: contract.id,
            rentAmount: contract.rentAmount,
            agencyPercent: contract.agencyPercent,
            agencyAmount: contract.agencyAmount,
            ownerAmount: contract.ownerAmount,
            tenantName: contract.tenantProperty?.name || null,
            pdfUrl: contract.pdfUrl || null,
            pdfGeneratedAt: contract.pdfGeneratedAt || null,
          }
        : null,
    };
  }
}
