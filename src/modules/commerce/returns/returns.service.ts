import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async createReturn(data: {
    saleId: string;
    tenantId: string;
    items: {
      productId: string;
      quantity: number;
      restock?: boolean;
    }[];
    reason?: string;
    refundMethod: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: data.saleId },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundException('Sale introuvable');
      }

      let totalRefund = 0;
      const returnItemsData: {
        productId: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        restock: boolean;
      }[] = [];

      for (const item of data.items) {
        const saleItem = sale.items.find((i) => i.productId === item.productId);

        if (!saleItem) {
          throw new BadRequestException('Produit non trouvé dans la vente');
        }

        if (item.quantity > saleItem.quantity) {
          throw new BadRequestException('Quantité invalide');
        }

        const lineTotal = Number(saleItem.price) * item.quantity;
        totalRefund += lineTotal;

        if (item.restock !== false) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        returnItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(saleItem.price),
          lineTotal,
          restock: item.restock ?? true,
        });
      }

      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId: data.saleId,
          tenantId: data.tenantId,
          totalRefund,
          reason: data.reason,
          items: {
            create: returnItemsData,
          },
        },
        include: { items: true },
      });

      await tx.refund.create({
        data: {
          saleReturnId: saleReturn.id,
          method: data.refundMethod,
          amount: totalRefund,
        },
      });

      return saleReturn;
    });
  }
}
