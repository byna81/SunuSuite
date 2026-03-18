import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    items: { productId: string; quantity: number }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: data.items.map((i) => i.productId) },
        },
      });

      let total = 0;

      const itemsData = data.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error('Produit introuvable');
        }

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}`);
        }

        const price = product.price;
        total += price * item.quantity;

        return {
          productId: item.productId,
          quantity: item.quantity,
          price,
        };
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      const sale = await tx.sale.create({
        data: {
          tenantId: data.tenantId,
          total,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      return sale;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });
  }
}
