import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, data: any) {
    return this.prisma.property.create({
      data: {
        tenantId,
        title: data.title,
        type: data.type,
        address: data.address,
        amount: data.amount,
        status: data.status,
        description: data.description,
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
