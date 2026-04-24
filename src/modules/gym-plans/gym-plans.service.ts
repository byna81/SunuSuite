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
}
