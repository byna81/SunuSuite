import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.gymSubscription.findMany({
      where: { tenantId },
      include: {
        member: true,
      },
      orderBy: {
        endDate: 'desc',
      },
    });
  }

  async create(
    tenantId: string,
    body: {
      memberId: string;
      type: string;
      price: number;
      startDate: string;
      endDate: string;
    },
  ) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');

    const { memberId, type, price, startDate, endDate } = body;

    if (!memberId || !type || !price || !startDate || !endDate) {
      throw new BadRequestException('Champs obligatoires manquants');
    }

    return this.prisma.gymSubscription.create({
      data: {
        tenantId,
        memberId,
        type,
        price: Number(price),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
      },
      include: {
        member: true,
      },
    });
  }

 async updateStatus(id: string, tenantId: string, body: any) {
  const subscription = await this.prisma.gymSubscription.findFirst({
    where: {
      id,
      tenantId,
    },
  });

  if (!subscription) {
    throw new Error('Abonnement introuvable');
  }

  let isActive = subscription.isActive;

  if (body.action === 'activate') {
    isActive = true;
  }

  if (body.action === 'suspend') {
    isActive = false;
  }

  if (body.action === 'deactivate') {
    isActive = false;
  }

  return this.prisma.gymSubscription.update({
    where: { id },
    data: {
      isActive,
      updatedAt: new Date(),
    },
  });
}}


