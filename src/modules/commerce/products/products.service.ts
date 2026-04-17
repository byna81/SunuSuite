import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private ensureCanManageProducts(currentUser: any, tenantId: string) {
  if (!currentUser) {
    throw new ForbiddenException('Accès refusé');
  }

  if (!tenantId || currentUser.tenantId !== tenantId) {
    throw new ForbiddenException('Accès refusé');
  }

  if (currentUser.role === 'manager') {
    return;
  }

  // TEMPORAIRE : on autorise tous les agents
  if (currentUser.role === 'agent') {
    return;
  }

  throw new ForbiddenException('Accès refusé');
}

  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async search(tenantId: string, q: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBarcode(tenantId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        barcode,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async create(currentUser: any, body: any) {
    const tenantId = String(body?.tenantId || '').trim();
    this.ensureCanManageProducts(currentUser, tenantId);

    const name = String(body?.name || '').trim();
    const price = Number(body?.price);
    const stock = Number(body?.stock ?? 0);
    const barcode = body?.barcode ? String(body.barcode).trim() : null;

    const stockCost =
      body?.stockCost !== undefined &&
      body?.stockCost !== null &&
      body?.stockCost !== ''
        ? Number(body.stockCost)
        : null;

    const paymentMethod = body?.paymentMethod
      ? String(body.paymentMethod).trim()
      : null;

    const supplier = body?.supplier ? String(body.supplier).trim() : null;
    const note = body?.note ? String(body.note).trim() : null;

    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!name) {
      throw new BadRequestException('Le nom du produit est obligatoire');
    }

    if (Number.isNaN(price) || price <= 0) {
      throw new BadRequestException('Le prix doit être supérieur à 0');
    }

    if (Number.isNaN(stock) || stock < 0) {
      throw new BadRequestException(
        'Le stock doit être supérieur ou égal à 0',
      );
    }

    if (stockCost !== null && (Number.isNaN(stockCost) || stockCost < 0)) {
      throw new BadRequestException(
        'Le montant dépensé pour le stock doit être supérieur ou égal à 0',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          categoryId: body.categoryId ?? null,
          name,
          price,
          stock,
          barcode,
          isActive: true,
        },
      });

      if (stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            tenantId,
            userId: currentUser?.id || body?.userId || null,
            type: 'in',
            quantity: stock,
            previousStock: 0,
            newStock: stock,
            note: 'Stock initial produit',
          },
        });
      }

      if (stock > 0 && stockCost !== null && stockCost > 0) {
        const expenseNoteParts = [
          supplier ? `Fournisseur: ${supplier}` : null,
          note || null,
        ].filter(Boolean);

        await tx.commerceExpense.create({
          data: {
            tenantId,
            label: `Achat stock - ${name}`,
            category: 'stock',
            amount: stockCost,
            expenseDate: new Date(),
            paymentMethod,
            note:
              expenseNoteParts.length > 0
                ? expenseNoteParts.join(' | ')
                : null,
          },
        });
      }

      return product;
    });
  }
async addStock(currentUser: any, id: string, body: any) {
  const existing = await this.prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundException('Produit introuvable');
  }

  this.ensureCanManageProducts(currentUser, existing.tenantId);

  const quantity = Number(body?.quantity ?? 0);
  const stockCost =
    body?.stockCost !== undefined &&
    body?.stockCost !== null &&
    body?.stockCost !== ''
      ? Number(body.stockCost)
      : null;

  const paymentMethod = body?.paymentMethod
    ? String(body.paymentMethod).trim()
    : null;

  const supplier = body?.supplier ? String(body.supplier).trim() : null;
  const note = body?.note ? String(body.note).trim() : null;

  if (Number.isNaN(quantity) || quantity <= 0) {
    throw new BadRequestException(
      'La quantité à ajouter doit être supérieure à 0',
    );
  }

  if (stockCost !== null && (Number.isNaN(stockCost) || stockCost < 0)) {
    throw new BadRequestException(
      'Le montant dépensé doit être supérieur ou égal à 0',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id },
      data: {
        stock: existing.stock + quantity,
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: existing.id,
        tenantId: existing.tenantId,
        userId: currentUser?.id || currentUser?.userId || null,
        type: 'in',
        quantity,
        previousStock: existing.stock,
        newStock: existing.stock + quantity,
        note: note || 'Réapprovisionnement de stock',
      },
    });

    if (stockCost !== null && stockCost > 0) {
      const expenseNoteParts = [
        supplier ? `Fournisseur: ${supplier}` : null,
        note || null,
      ].filter(Boolean);

      await tx.commerceExpense.create({
        data: {
          tenantId: existing.tenantId,
          label: `Réapprovisionnement stock - ${existing.name}`,
          category: 'stock',
          amount: stockCost,
          expenseDate: new Date(),
          paymentMethod,
          note:
            expenseNoteParts.length > 0
              ? expenseNoteParts.join(' | ')
              : null,
        },
      });
    }

    return {
      message: 'Stock réapprovisionné avec succès',
      product: updatedProduct,
    };
  });
}
  async update(currentUser: any, id: string, body: any) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Produit introuvable');
    }

    this.ensureCanManageProducts(currentUser, existing.tenantId);

    const name = String(body?.name || '').trim();
    const price = Number(body?.price);
    const stock = Number(body?.stock ?? 0);
    const barcode = body?.barcode ? String(body.barcode).trim() : null;

    if (!name) {
      throw new BadRequestException('Le nom du produit est obligatoire');
    }

    if (Number.isNaN(price) || price <= 0) {
      throw new BadRequestException('Le prix doit être supérieur à 0');
    }

    if (Number.isNaN(stock) || stock < 0) {
      throw new BadRequestException(
        'Le stock doit être supérieur ou égal à 0',
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name,
        price,
        stock,
        barcode,
        categoryId: body.categoryId ?? undefined,
      },
    });
  }

  async remove(currentUser: any, id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Produit introuvable');
    }

    this.ensureCanManageProducts(currentUser, existing.tenantId);

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
