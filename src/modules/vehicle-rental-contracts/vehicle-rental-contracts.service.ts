import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehicleRentalContractsService {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string, id: string) {
    const contract = await this.prisma.vehicleRentalContract.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        customer: true,
        payments: true,
        extensions: true,
        rentalReturn: true,
      },
    });

    if (!contract) throw new NotFoundException('Contrat introuvable');

    return contract;
  }

  // =========================
  // 🔥 PROLONGATION
  // =========================
  async extend(tenantId: string, id: string, body: any) {
    const contract = await this.findOne(tenantId, id);

    if (contract.rentalReturn) {
      throw new BadRequestException('Contrat déjà terminé');
    }

    const oldEnd = new Date(contract.endDate);
    const newEnd = new Date(body.newEndDate);

    if (newEnd <= oldEnd) {
      throw new BadRequestException('La nouvelle date doit être supérieure');
    }

    const diffDays =
      Math.ceil((newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60 * 24));

    const addedAmount = diffDays * Number(contract.unitPrice || 0);
    const newTotal = Number(contract.totalAmount || 0) + addedAmount;

    await this.prisma.vehicleRentalExtension.create({
      data: {
        contractId: contract.id,
        previousEndDate: oldEnd,
        newEndDate: newEnd,
        addedDays: diffDays,
        addedAmount,
        newTotal,
        note: body.note || null,
      },
    });

    await this.prisma.vehicleRentalContract.update({
      where: { id },
      data: {
        endDate: newEnd,
        totalAmount: newTotal,
      },
    });

    return this.findOne(tenantId, id);
  }

  // =========================
  // 🔥 RETOUR VEHICULE
  // =========================
  async registerReturn(tenantId: string, id: string, body: any) {
    const contract = await this.findOne(tenantId, id);

    if (contract.rentalReturn) {
      throw new BadRequestException('Retour déjà enregistré');
    }

    const held = Number(body.depositHeldAmount || 0);
    const deposit = Number(contract.depositAmount || 0);

    const returned = Math.max(deposit - held, 0);

    await this.prisma.vehicleRentalReturn.create({
      data: {
        contractId: id,
        actualReturnDate: body.actualReturnDate
          ? new Date(body.actualReturnDate)
          : new Date(),
        returnMileage: body.returnMileage,
        fuelLevelReturn: body.fuelLevelReturn,
        hasDamage: body.hasDamage,
        vehicleConditionOk: body.vehicleConditionOk,
        depositHeldAmount: held,
        depositReturnedAmount: returned,
        holdReason: body.holdReason,
        damageNote: body.damageNote,
        missingItemsNote: body.missingItemsNote,
        note: body.note,
      },
    });

    // 🔥 remettre véhicule dispo
    await this.prisma.vehicle.update({
      where: { id: contract.vehicleId },
      data: {
        status: 'disponible',
      },
    });

    // 🔥 terminer contrat
    await this.prisma.vehicleRentalContract.update({
      where: { id },
      data: {
        status: 'termine',
      },
    });

    return this.findOne(tenantId, id);
  }

  // =========================
  // 💰 PAIEMENT
  // =========================
  async addPayment(tenantId: string, id: string, body: any) {
    const contract = await this.findOne(tenantId, id);

    await this.prisma.vehicleRentalPayment.create({
      data: {
        contractId: id,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        reference: body.reference,
        note: body.note,
      },
    });

    const payments = await this.prisma.vehicleRentalPayment.findMany({
      where: { contractId: id },
    });

    const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    await this.prisma.vehicleRentalContract.update({
      where: { id },
      data: {
        amountPaid: paid,
        remainingAmount: Number(contract.totalAmount) - paid,
        status: paid >= Number(contract.totalAmount) ? 'solde' : 'actif',
      },
    });

    return this.findOne(tenantId, id);
  }
}
