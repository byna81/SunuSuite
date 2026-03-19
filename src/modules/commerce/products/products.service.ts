import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    categoryId?: string;
    name: string;
    price: number;
    stock?: number;
    barcode?: string;
  }) {
    if (!data.tenantId) throw new BadRequestException('tenantId obligatoire');
    if (!data.name?.trim()) throw new BadRequestException('Nom obligatoire');
    if (!data.price || data.price <= 0)
      throw new BadRequestException('Prix invalide');

    const barcode = data.barcode?.trim() || null;

    if (barcode) {
      const exists = await this.prisma.product.findFirst({
        where: {
          tenantId: data.tenantId,
          barcode,
        },
      });

      if (exists) {
        throw new BadRequestException('Barcode déjà utilisé');
      }
    }

    return this.prisma.product.create({
      data: {
        tenantId: data.tenantId,
        categoryId: data.categoryId || null,
        name: data.name.trim(),
        price: Number(data.price),
        stock: data.stock ?? 0,
        barcode,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) throw new NotFoundException('Produit introuvable');

    return product;
  }

  async findByBarcode(barcode: string, tenantId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        barcode,
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!product) throw new NotFoundException('Produit non trouvé');

    return product;
  }

  async search(tenantId: string, q: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q } },
        ],
      },
      take: 20,
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      price?: number;
      stock?: number;
      categoryId?: string;
      barcode?: string;
      isActive?: boolean;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) throw new NotFoundException('Produit introuvable');

    if (data.barcode) {
      const exists = await this.prisma.product.findFirst({
        where: {
          tenantId: product.tenantId,
          barcode: data.barcode,
          id: { not: id },
        },
      });

      if (exists) throw new BadRequestException('Barcode déjà utilisé');
    }

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // 🔥 AJOUT STOCK (entrée marchandise)
  async addStock(productId: string, quantity: number) {
    if (!quantity || quantity <= 0)
      throw new BadRequestException('Quantité invalide');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          stock: { increment: quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type: 'IN',
          quantity,
        },
      });

      return product;
    });
  }
}
