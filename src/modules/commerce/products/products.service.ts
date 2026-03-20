import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async search(tenantId: string, q: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBarcode(tenantId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        barcode,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async create(body: any) {
    return this.prisma.product.create({
      data: {
        tenantId: body.tenantId,
        categoryId: body.categoryId ?? null,
        name: body.name,
        price: Number(body.price),
        stock: Number(body.stock ?? 0),
        barcode: body.barcode ?? null,
        isActive: true,
      },
    });
  }

  async update(id: string, body: any) {
    return this.prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        price: Number(body.price),
        stock: Number(body.stock ?? 0),
        barcode: body.barcode ?? null,
        categoryId: body.categoryId ?? undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
