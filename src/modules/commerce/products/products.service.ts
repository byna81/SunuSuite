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
    isActive?: boolean;
    barcode?: string;
  }) {
    if (!data.tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!data.name?.trim()) {
      throw new BadRequestException('Nom du produit obligatoire');
    }

    if (!data.price || Number(data.price) <= 0) {
      throw new BadRequestException('Prix invalide');
    }

    if (data.stock !== undefined && Number(data.stock) < 0) {
      throw new BadRequestException('Stock invalide');
    }

    const barcode = data.barcode?.trim() || null;

    if (barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: {
          tenantId: data.tenantId,
          barcode,
        },
      });

      if (existingBarcode) {
        throw new BadRequestException('Ce code-barres existe déjà pour ce commerce');
      }
    }

    return this.prisma.product.create({
      data: {
        tenantId: data.tenantId,
        categoryId: data.categoryId || null,
        name: data.name.trim(),
        price: Number(data.price),
        stock: data.stock ?? 0,
        isActive: data.isActive ?? true,
        barcode,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

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

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async findByBarcode(barcode: string, tenantId?: string) {
    if (!barcode?.trim()) {
      throw new BadRequestException('barcode obligatoire');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        barcode: barcode.trim(),
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
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

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async search(tenantId: string, q: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!q?.trim()) {
      throw new BadRequestException('Paramètre q obligatoire');
    }

    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          {
            name: {
              contains: q.trim(),
              mode: 'insensitive',
            },
          },
          {
            barcode: {
              contains: q.trim(),
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
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
      categoryId?: string | null;
      barcode?: string | null;
      isActive?: boolean;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    if (data.price !== undefined && Number(data.price) <= 0) {
      throw new BadRequestException('Prix invalide');
    }

    if (data.stock !== undefined && Number(data.stock) < 0) {
      throw new BadRequestException('Stock invalide');
    }

    const barcode =
      data.barcode === undefined
        ? undefined
        : data.barcode === null
        ? null
        : data.barcode.trim();

    if (barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: {
          tenantId: product.tenantId,
          barcode,
          id: { not: id },
        },
      });

      if (existingBarcode) {
        throw new BadRequestException('Ce code-barres existe déjà pour ce commerce');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.price !== undefined ? { price: Number(data.price) } : {}),
        ...(data.stock !== undefined ? { stock: Number(data.stock) } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(barcode !== undefined ? { barcode } : {}),
      },
      include: {
        category: true,
      },
    });
  }

  async deactivate(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
