import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subscription.findMany({
      include: {
        tenant: true,
        plan: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        tenant: true,
        plan: true,
        payments: true,
      },
    });

    if (!item) {
      throw new BadRequestException('Abonnement introuvable');
    }

    return item;
  }

  async addPayment(
    id: string,
    body: {
      amount: number;
      paymentMethod?: string;
      transactionRef?: string;
      status?: 'pending' | 'paid' | 'failed';
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new BadRequestException('Abonnement introuvable');
    }

    if (Number(body.amount || 0) <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    return this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: id,
        amount: Number(body.amount),
        currency: 'XOF',
        paymentMethod: body.paymentMethod?.trim() || null,
        transactionRef: body.transactionRef?.trim() || null,
        status: body.status || 'paid',
        paidAt: body.status === 'failed' ? null : new Date(),
      },
    });
  }
}
