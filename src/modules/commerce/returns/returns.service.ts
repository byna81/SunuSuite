import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    saleId: string;
    productId: string;
    quantity: number;
  }) {
    if (!data.quantity || data.quantity <= 0) {
      throw new BadRequestException('Quantité invalide');
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: data.saleId },
      });

      if (!sale) throw new NotFoundException('Vente introuvable');

      const item = await tx.saleItem.findFirst({
        where: {
          saleId: data.saleId,
          productId: data.productId,
        },
      });

      if (!item) throw new NotFoundException('Produit non trouvé dans la vente');

      if (data.quantity > item.quantity) {
        throw new BadRequestException('Quantité supérieure à la vente');
      }

      // 🔥 RESTOCK
      await tx.product.update({
        where: { id: data.productId },
        data: {
          stock: { increment: data.quantity },
        },
      });

      // 🔥 MOUVEMENT
      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: 'RETURN',
          quantity: data.quantity,
        },
      });

      return {
        message: 'Retour effectué',
      };
    });
  }
}
