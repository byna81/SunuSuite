import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.gymPlan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(tenantId: string, body: any) {
    return this.prisma.gymPlan.create({
      data: {
        tenant: {
          connect: { id: tenantId },
        },
        name: body.name,
        price: Number(body.price),
        durationMonths: Number(body.durationMonths || body.duration),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: true,
      },
    });
  }

  async update(id: string, tenantId: string, body: any) {
    const plan = await this.prisma.gymPlan.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!plan) {
      throw new NotFoundException('Formule introuvable');
    }

    return this.prisma.gymPlan.update({
      where: { id },
      data: {
        name: body.name,
        price: Number(body.price),
        durationMonths: Number(body.durationMonths || body.duration),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
  }

  async toggle(id: string, tenantId: string) {
    const plan = await this.prisma.gymPlan.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!plan) {
      throw new NotFoundException('Formule introuvable');
    }

    return this.prisma.gymPlan.update({
      where: { id },
      data: {
        isActive: !plan.isActive,
      },
    });
  }
}
