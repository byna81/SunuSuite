import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { tenantId: string; name: string }) {
    if (!data.tenantId) throw new BadRequestException('tenantId obligatoire');
    if (!data.name?.trim()) throw new BadRequestException('Nom obligatoire');

    return this.prisma.category.create({
      data: {
        tenantId: data.tenantId,
        name: data.name.trim(),
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, name: string) {
    return this.prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  async delete(id: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
