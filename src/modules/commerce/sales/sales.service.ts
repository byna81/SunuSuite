import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    items: { productId: string; quantity: number }[];
    cashierId?: string | null;
  }) {
    if (!data.tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Au moins un article est obligatoire');
    }

    return this.prisma.$transaction(async (tx) => {
      let total = 0;

      const sale = await tx.sale.create({
        data: {
          tenantId: data.tenantId,
          cashierId: data.cashierId || null,
          total: 0,
          status: 'unpaid',
        },
      });

      for (const item of data.items) {
        if (!item.productId) {
          throw new BadRequestException('productId obligatoire');
        }

        if (!item.quantity || item.quantity <= 0) {
          throw new BadRequestException('Quantité invalide');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException('Produit introuvable');
        }

        if (!product.isActive) {
          throw new BadRequestException(`Produit inactif: ${product.name}`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}`,
          );
        }

        const previousStock = product.stock;
        const newStock = product.stock - item.quantity;
        const lineTotal = Number(product.price) * item.quantity;

        total += lineTotal;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            quantity: item.quantity,
            price: Number(product.price),
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            tenantId: data.tenantId,
            userId: data.cashierId || null,
            type: 'out',
            quantity: item.quantity,
            previousStock,
            newStock,
            note: `Vente produit - vente ${sale.id}`,
          },
        });
      }

      return tx.sale.update({
        where: { id: sale.id },
        data: { total },
        include: {
          cashier: true,
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      });
    });
  }

  async findAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        cashier: true,
        items: {
          include: { product: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        cashier: true,
        items: {
          include: { product: true },
        },
        payments: true,
        returns: {
          include: {
            items: true,
            refunds: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Vente introuvable');
    }

    return sale;
  }
}
