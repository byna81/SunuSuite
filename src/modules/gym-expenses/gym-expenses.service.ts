import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GymExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.gymExpense.findMany({
      where: { tenantId },
      include: {
        corrections: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(body: any) {
    if (!body?.tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.type) {
      throw new BadRequestException('Type de dépense obligatoire');
    }

    const amount = Number(body.amount);

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    return this.prisma.gymExpense.create({
      data: {
        tenantId: body.tenantId,
        type: body.type,
        amount,
        beneficiary: body.beneficiary || null,
        description: body.description || null,
        createdByUserId: body.createdByUserId || null,
        createdByName: body.createdByName || null,
        createdByLogin: body.createdByLogin || null,
      },
    });
  }

  async correct(id: string, tenantId: string, body: any) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const newAmount = Number(body.amount);

    if (!newAmount || Number.isNaN(newAmount) || newAmount <= 0) {
      throw new BadRequestException('Nouveau montant invalide');
    }

    if (!body?.correctionReason?.trim()) {
      throw new BadRequestException('Raison de correction obligatoire');
    }

    const expense = await this.prisma.gymExpense.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!expense) {
      throw new NotFoundException('Dépense introuvable');
    }

    return this.prisma.$transaction(async (tx) => {
      const correction = await tx.gymExpenseCorrection.create({
        data: {
          expenseId: expense.id,
          oldAmount: expense.amount,
          newAmount,
          reason: body.correctionReason.trim(),
          correctedByUserId: body.correctedByUserId || null,
          correctedByName: body.correctedByName || null,
          correctedByLogin: body.correctedByLogin || null,
        },
      });

      const updatedExpense = await tx.gymExpense.update({
        where: { id: expense.id },
        data: {
          amount: newAmount,
        },
        include: {
          corrections: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return {
        expense: updatedExpense,
        correction,
      };
    });
  }
}
