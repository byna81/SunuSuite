import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleRentalContractsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicleRentalContract.findMany({
      where: { tenantId },
      include: {
        tenant: true,
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
    const item = await this.prisma.vehicleRentalContract.findFirst({
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
      throw new BadRequestException('Contrat de location introuvable');
    }

    return item;
  }

  async create(
    tenantId: string,
    body: {
      vehicleId: string;
      customerId: string;
      startDate: string;
      endDate?: string;
      pricingUnit?: string;
      unitPrice: number;
      totalAmount?: number;
      depositAmount?: number;
      amountPaid?: number;
      paymentMethod?: string;
      reference?: string;
      paymentFrequency?: string;
      dueDay?: number;
      notes?: string;
    },
  ) {
    if (!body.vehicleId) {
      throw new BadRequestException('Le véhicule est obligatoire');
    }

    if (!body.customerId) {
      throw new BadRequestException('Le client est obligatoire');
    }

    if (!body.startDate) {
      throw new BadRequestException('La date de début est obligatoire');
    }

    const unitPrice = Number(body.unitPrice || 0);
    const totalAmount = Number(body.totalAmount || 0);
    const depositAmount = Number(body.depositAmount || 0);
    const amountPaid = Number(body.amountPaid || 0);

    if (unitPrice < 0) {
      throw new BadRequestException('Le tarif ne peut pas être négatif');
    }

    if (totalAmount <= 0) {
      throw new BadRequestException('Le montant total doit être supérieur à 0');
    }

    if (depositAmount < 0) {
      throw new BadRequestException('La caution ne peut pas être négative');
    }

    if (amountPaid < 0) {
      throw new BadRequestException('Le montant payé ne peut pas être négatif');
    }

    if (amountPaid > totalAmount) {
      throw new BadRequestException(
        'Le montant payé ne peut pas dépasser le montant total',
      );
    }

    const startDate = new Date(body.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Date de début invalide');
    }

    let endDate: Date | null = null;
    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (Number.isNaN(endDate.getTime())) {
        throw new BadRequestException('Date de fin invalide');
      }

      if (endDate.getTime() < startDate.getTime()) {
        throw new BadRequestException(
          'La date de fin doit être postérieure à la date de début',
        );
      }
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

    const remainingAmount = totalAmount - amountPaid;
    const status = remainingAmount <= 0 ? 'solde' : 'actif';

    const contract = await this.prisma.vehicleRentalContract.create({
      data: {
        tenantId,
        vehicleId: body.vehicleId,
        customerId: body.customerId,
        startDate,
        endDate,
        pricingUnit: body.pricingUnit?.trim() || 'month',
        unitPrice,
        totalAmount,
        depositAmount,
        amountPaid,
        remainingAmount,
        status,
        paymentFrequency: body.paymentFrequency?.trim() || 'mensuel',
        dueDay:
          body.dueDay !== undefined && body.dueDay !== null
            ? Number(body.dueDay)
            : null,
        notes: body.notes?.trim() || null,
      },
      include: {
        tenant: true,
        vehicle: true,
        customer: true,
        payments: true,
      },
    });

    if (amountPaid > 0) {
      await this.prisma.vehiclePayment.create({
        data: {
          tenantId,
          paymentType: 'rental',
          rentalContractId: contract.id,
          amount: amountPaid,
          paymentMethod: body.paymentMethod?.trim() || 'cash',
          reference: body.reference?.trim() || null,
          note: 'Paiement initial à la création du contrat',
          paidAt: new Date(),
        },
      });
    }

    await this.prisma.vehicle.update({
      where: { id: body.vehicleId },
      data: {
        status: 'loue',
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
    const contract = await this.prisma.vehicleRentalContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vehicle: true,
      },
    });

    if (!contract) {
      throw new BadRequestException('Contrat de location introuvable');
    }

    const amount = Number(body.amount || 0);

    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    if (!body.paymentMethod?.trim()) {
      throw new BadRequestException('Le moyen de paiement est obligatoire');
    }

    const nextAmountPaid = Number(contract.amountPaid || 0) + amount;

    if (nextAmountPaid > Number(contract.totalAmount || 0)) {
      throw new BadRequestException(
        'Le paiement dépasse le montant restant du contrat',
      );
    }

    const remainingAmount = Number(contract.totalAmount || 0) - nextAmountPaid;
    const status = remainingAmount <= 0 ? 'solde' : 'actif';

    await this.prisma.vehiclePayment.create({
      data: {
        tenantId,
        paymentType: 'rental',
        rentalContractId: contract.id,
        amount,
        paymentMethod: body.paymentMethod.trim(),
        reference: body.reference?.trim() || null,
        note: body.note?.trim() || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      },
    });

    await this.prisma.vehicleRentalContract.update({
      where: { id: contract.id },
      data: {
        amountPaid: nextAmountPaid,
        remainingAmount,
        status,
      },
    });

    return this.findOne(tenantId, contract.id);
  }
}
