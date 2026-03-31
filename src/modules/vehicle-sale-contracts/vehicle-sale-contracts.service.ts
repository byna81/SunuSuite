import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
        tenant: true,
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
        tenant: true,
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
}
