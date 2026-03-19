async create(data: {
  tenantId: string;
  items: { productId: string; quantity: number }[];
}) {
  return this.prisma.$transaction(async (tx) => {
    let total = 0;

    const sale = await tx.sale.create({
      data: {
        tenantId: data.tenantId,
        total: 0,
      },
    });

    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) throw new Error('Produit introuvable');

      if (product.stock < item.quantity) {
        throw new Error('Stock insuffisant');
      }

      total += product.price * item.quantity;

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
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

      // 🔥 MOUVEMENT STOCK
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: 'SALE',
          quantity: item.quantity,
        },
      });
    }

    return tx.sale.update({
      where: { id: sale.id },
      data: { total },
    });
  });
}

async findAll(tenantId: string) {
  return this.prisma.sale.findMany({
    where: { tenantId },
    include: {
      items: {
        include: { product: true },
      },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
