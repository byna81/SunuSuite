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
      // 1. Récupérer les produits
      const products = await tx.product.findMany({
        where: {
          id: { in: data.items.map(i => i.productId) },
        },
      });

      let total = 0;

      // 2. Préparer les lignes + vérifications
      const itemsData = data.items.map(item => {
        const product = products.find(p => p.id === item.productId);

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

      // 3. Décrémenter le stock
      await Promise.all(
        data.items.map(item =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        )
      );

      // 4. Créer la vente
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
        },
      });

      return sale;
    });
  }
}
