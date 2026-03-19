import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(data: {
    tenantId: string;
    categoryId?: string;
    name: string;
    price: number;
    stock?: number;
    isActive?: boolean;
    barcode?: string;
  }) {
    return this.prisma.product.create({
      data: {
        tenantId: data.tenantId,
        categoryId: data.categoryId,
        name: data.name,
        price: Number(data.price),
        stock: data.stock ?? 0,
        isActive: data.isActive ?? true,
        barcode: data.barcode ?? null,
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByBarcode(barcode: string) {
    return this.prisma.product.findFirst({
      where: {
        barcode,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        categoryId: true,
        name: true,
        price: true,
        stock: true,
        barcode: true,
        isActive: true,
      },
    });
  }
}
