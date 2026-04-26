import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');

    return this.prisma.gymPayment.findMany({
      where: { tenantId },
      include: {
        member: true,
        corrections: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, body: any) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');
    if (!body.memberId) throw new BadRequestException('Client obligatoire');
    if (!body.amount) throw new BadRequestException('Montant obligatoire');
    if (!body.method) throw new BadRequestException('Méthode obligatoire');

    const amount = Number(body.amount);

    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    const member = await this.prisma.gymMember.findFirst({
      where: { id: body.memberId, tenantId },
    });

    if (!member) throw new BadRequestException('Client introuvable');

    return this.prisma.gymPayment.create({
      data: {
        tenantId,
        memberId: body.memberId,
        amount,
        method: body.method,
        reason: body.reason?.trim() || null,
      },
      include: {
        member: true,
        corrections: true,
      },
    });
  }

  async correct(id: string, tenantId: string, body: any) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');
    if (!id) throw new BadRequestException('paymentId obligatoire');
    if (!body.amount) throw new BadRequestException('Nouveau montant obligatoire');
    if (!body.correctionReason?.trim()) {
      throw new BadRequestException('Raison de correction obligatoire');
    }

    const newAmount = Number(body.amount);

    if (Number.isNaN(newAmount) || newAmount <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    const payment = await this.prisma.gymPayment.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      throw new BadRequestException('Paiement introuvable');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.gymPaymentCorrection.create({
        data: {
          paymentId: payment.id,
          tenantId,
          oldAmount: payment.amount,
          newAmount,
          reason: body.correctionReason.trim(),

          correctedByUserId: body.correctedByUserId || null,
          correctedByName: body.correctedByName || null,
          correctedByLogin: body.correctedByLogin || null,
        },
      });

      return tx.gymPayment.update({
        where: { id: payment.id },
        data: {
          amount: newAmount,
          reason: body.reason?.trim() || payment.reason,
          method: body.method || payment.method,
        },
        include: {
          member: true,
          corrections: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  }
}
