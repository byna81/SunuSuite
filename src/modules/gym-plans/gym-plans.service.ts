import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.gymPlan.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(tenantId: string, body: any) {
    return this.prisma.gymPlan.create({
      data: {
        tenantId,
        name: body.name,
        price: body.price,
        durationMonths: body.durationMonths,
      },
    });
  }
  update(id: string, tenantId: string, body: any) {
  return this.prisma.gymPlan.update({
    where: { id },
    data: {
      name: body.name,
      price: Number(body.price),
      durationMonths: Number(body.durationMonths),
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  });
}

toggle(id: string) {
  return this.prisma.gymPlan.findUnique({ where: { id } }).then((plan) => {
    if (!plan) {
      throw new Error("Formule introuvable");
    }

    return this.prisma.gymPlan.update({
      where: { id },
      data: {
        isActive: !plan.isActive,
      },
    });
  });
}
}
