import { Injectable, NotFoundException } from '@nestjs/common';
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

      return tx.sale.create({
        data: {
          tenantId: data.tenantId,
          total,
          status: 'unpaid',
          items: {
            create: itemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          payments: true,
        },
      });
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

  async syncStatus(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${id} introuvable`);
    }

    const paid = (sale.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

    let status = 'unpaid';
    if (paid > 0 && paid < Number(sale.total)) {
      status = 'partial';
    } else if (paid >= Number(sale.total)) {
      status = 'paid';
    }

    return this.prisma.sale.update({
      where: { id },
      data: { status },
      include: { payments: true, items: true },
    });
  }
}
