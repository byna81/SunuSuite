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
        extensions: {
          orderBy: { createdAt: 'desc' },
        },
        rentalReturn: true,
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
        extensions: {
          orderBy: { createdAt: 'desc' },
        },
        rentalReturn: true,
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

  async extend(
    tenantId: string,
    id: string,
    body: {
      newEndDate: string;
      note?: string;
    },
  ) {
    const contract = await this.prisma.vehicleRentalContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        rentalReturn: true,
      },
    });

    if (!contract) {
      throw new BadRequestException('Contrat de location introuvable');
    }

    if (contract.rentalReturn) {
      throw new BadRequestException(
        'Impossible de prolonger un contrat déjà clôturé par retour',
      );
    }

    if (!contract.endDate) {
      throw new BadRequestException(
        'Ce contrat ne possède pas de date de fin à prolonger',
      );
    }

    if (!body.newEndDate?.trim()) {
      throw new BadRequestException('La nouvelle date de fin est obligatoire');
    }

    const previousEndDate = new Date(contract.endDate);
    const newEndDate = new Date(body.newEndDate);

    if (Number.isNaN(newEndDate.getTime())) {
      throw new BadRequestException('Nouvelle date de fin invalide');
    }

    if (newEndDate.getTime() <= previousEndDate.getTime()) {
      throw new BadRequestException(
        'La nouvelle date doit être postérieure à la fin actuelle',
      );
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const addedDays = Math.ceil(
      (newEndDate.getTime() - previousEndDate.getTime()) / msPerDay,
    );

    let addedAmount = 0;
    const unitPrice = Number(contract.unitPrice || 0);
    const pricingUnit = String(contract.pricingUnit || 'month');

    if (pricingUnit === 'day') {
      addedAmount = addedDays * unitPrice;
    } else if (pricingUnit === 'week') {
      addedAmount = Math.ceil(addedDays / 7) * unitPrice;
    } else {
      addedAmount = Math.ceil(addedDays / 30) * unitPrice;
    }

    const newTotal = Number(contract.totalAmount || 0) + addedAmount;
    const remainingAmount = newTotal - Number(contract.amountPaid || 0);
    const status = remainingAmount <= 0 ? 'solde' : 'actif';

    await this.prisma.vehicleRentalExtension.create({
      data: {
        rentalContractId: contract.id,
        previousEndDate,
        newEndDate,
        addedAmount,
        newTotal,
        note: body.note?.trim() || null,
      },
    });

    await this.prisma.vehicleRentalContract.update({
      where: { id: contract.id },
      data: {
        endDate: newEndDate,
        totalAmount: newTotal,
        remainingAmount,
        status,
      },
    });

    return this.findOne(tenantId, contract.id);
  }

  async registerReturn(
    tenantId: string,
    id: string,
    body: {
      actualReturnDate?: string;
      returnMileage?: number;
      fuelLevelReturn?: string;
      hasDamage?: boolean;
      vehicleConditionOk?: boolean;
      depositHeldAmount?: number;
      holdReason?: string;
      damageNote?: string;
      missingItemsNote?: string;
      note?: string;
    },
  ) {
    const contract = await this.prisma.vehicleRentalContract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        rentalReturn: true,
        vehicle: true,
      },
    });

    if (!contract) {
      throw new BadRequestException('Contrat de location introuvable');
    }

    if (contract.rentalReturn) {
      throw new BadRequestException('Le retour est déjà enregistré');
    }

    const depositAmount = Number(contract.depositAmount || 0);
    const depositHeldAmount = Number(body.depositHeldAmount || 0);

    if (depositHeldAmount < 0) {
      throw new BadRequestException(
        'Le montant de caution retenu ne peut pas être négatif',
      );
    }

    if (depositHeldAmount > depositAmount) {
      throw new BadRequestException(
        'Le montant retenu ne peut pas dépasser la caution',
      );
    }

    const depositReturnedAmount = depositAmount - depositHeldAmount;

    const actualReturnDate = body.actualReturnDate?.trim()
      ? new Date(body.actualReturnDate)
      : new Date();

    if (Number.isNaN(actualReturnDate.getTime())) {
      throw new BadRequestException('Date réelle de retour invalide');
    }

    await this.prisma.vehicleRentalReturn.create({
      data: {
        rentalContract: {
          connect: { id: contract.id },
        },
        actualReturnDate,
        returnMileage:
          body.returnMileage !== undefined && body.returnMileage !== null
            ? Number(body.returnMileage)
            : null,
        fuelLevelReturn: body.fuelLevelReturn?.trim() || null,
        hasDamage: Boolean(body.hasDamage),
        vehicleConditionOk:
          body.vehicleConditionOk !== undefined
            ? Boolean(body.vehicleConditionOk)
            : true,
        depositHeldAmount,
        depositReturnedAmount,
        holdReason: body.holdReason?.trim() || null,
        damageNote: body.damageNote?.trim() || null,
        missingItemsNote: body.missingItemsNote?.trim() || null,
        note: body.note?.trim() || null,
      },
    });

    await this.prisma.vehicle.update({
      where: { id: contract.vehicleId },
      data: {
        status: 'disponible',
        mileage:
          body.returnMileage !== undefined && body.returnMileage !== null
            ? Number(body.returnMileage)
            : contract.vehicle?.mileage ?? undefined,
      },
    });

    await this.prisma.vehicleRentalContract.update({
      where: { id: contract.id },
      data: {
        status: 'termine',
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
