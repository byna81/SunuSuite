import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    items: { productId: string; quantity: number }[];
  }) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: data.items.map(i => i.productId) }
      }
    });

    let total = 0;

    const itemsData = data.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const price = product.price;

      total += price * item.quantity;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price
      };
    });

    return this.prisma.sale.create({
      data: {
        tenantId: data.tenantId,
        total,
        items: {
          create: itemsData
        }
      },
      include: {
        items: true
      }
    });
  }
}
