import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    refundMethod: string;
    reason?: string;
  }) {
    if (!data.saleId || !data.tenantId) {
      throw new BadRequestException('saleId et tenantId obligatoires');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Au moins un article est obligatoire');
    }

    if (!data.refundMethod?.trim()) {
      throw new BadRequestException('refundMethod obligatoire');
    }

    return this.prisma.$transaction(async (tx) => {
      let totalRefund = 0;

      const sale = await tx.sale.findUnique({
        where: { id: data.saleId },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundException('Vente introuvable');
      }

      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId: data.saleId,
          tenantId: data.tenantId,
          totalRefund: 0,
          reason: data.reason,
          status: 'completed',
        },
      });

      for (const item of data.items) {
        if (!item.productId) {
          throw new BadRequestException('productId obligatoire');
        }

        if (!item.quantity || item.quantity <= 0) {
          throw new BadRequestException('Quantité invalide');
        }

        const saleItem = sale.items.find(
          (saleItemRow) => saleItemRow.productId === item.productId,
        );

        if (!saleItem) {
          throw new NotFoundException('Produit non trouvé dans la vente');
        }

        if (item.quantity > saleItem.quantity) {
          throw new BadRequestException(
            'Quantité supérieure à la quantité vendue',
          );
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException('Produit introuvable');
        }

        const lineTotal = Number(saleItem.price) * item.quantity;
        totalRefund += lineTotal;

        await tx.saleReturnItem.create({
          data: {
            saleReturnId: saleReturn.id,
            productId: product.id,
            quantity: item.quantity,
            unitPrice: Number(saleItem.price),
            lineTotal,
            restock: item.restock ?? true,
          },
        });

        if (item.restock ?? true) {
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: 'RETURN',
              quantity: item.quantity,
            },
          });
        }
      }

      await tx.refund.create({
        data: {
          saleReturnId: saleReturn.id,
          method: data.refundMethod.trim(),
          amount: totalRefund,
          status: 'paid',
        },
      });

      return tx.saleReturn.update({
        where: { id: saleReturn.id },
        data: { totalRefund },
        include: {
          items: true,
          refunds: true,
        },
      });
    });
  }
}
