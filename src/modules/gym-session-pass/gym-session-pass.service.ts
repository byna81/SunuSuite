import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { randomUUID } from "crypto";

@Injectable()
export class GymSessionPassService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, body: any) {
    const {
      buyerName,
      buyerPhone,
      price,
      quantity,
      paymentMethod,
      validFrom,
      validUntil,
      soldByUserId,
      soldByUserName,
    } = body;

    if (!tenantId) {
      throw new BadRequestException("tenantId obligatoire");
    }

    if (!price || Number(price) <= 0) {
      throw new BadRequestException("Prix obligatoire");
    }

    if (!validFrom || !validUntil) {
      throw new BadRequestException("Plage horaire obligatoire");
    }

    const qty = Number(quantity || 1);

    if (qty <= 0) {
      throw new BadRequestException("Nombre de passes invalide");
    }

    const start = new Date(validFrom);
    const end = new Date(validUntil);

    if (end <= start) {
      throw new BadRequestException("L’heure de fin doit être après l’heure de début");
    }

    const passes = [];

    for (let i = 0; i < qty; i++) {
      passes.push({
        tenantId,
        buyerName: buyerName || null,
        buyerPhone: buyerPhone || null,
        price: Number(price),
        quantity: 1,
        paymentMethod: paymentMethod || "cash",
        validFrom: start,
        validUntil: end,
        qrCode: randomUUID(),
        status: "active",
        soldByUserId: soldByUserId || null,
        soldByUserName: soldByUserName || null,
      });
    }

    await this.prisma.gymSessionPass.createMany({
      data: passes,
    });

    const createdPasses = await this.prisma.gymSessionPass.findMany({
      where: {
        tenantId,
        buyerPhone: buyerPhone || null,
        validFrom: start,
        validUntil: end,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: qty,
    });

    return {
      success: true,
      count: createdPasses.length,
      totalAmount: Number(price) * qty,
      passes: createdPasses,
    };
  }

  async validate(qrCode: string, tenantId: string) {
    const pass = await this.prisma.gymSessionPass.findFirst({
      where: { qrCode, tenantId },
    });

    if (!pass) {
      throw new BadRequestException("Passe introuvable");
    }

    const now = new Date();

    if (pass.status !== "active") {
      throw new BadRequestException("Passe non active");
    }

    if (now < pass.validFrom || now > pass.validUntil) {
      throw new BadRequestException("Passe expirée ou non valide");
    }

    return { valid: true, pass };
  }

  async use(qrCode: string, tenantId: string) {
    const pass = await this.prisma.gymSessionPass.findFirst({
      where: { qrCode, tenantId },
    });

    if (!pass) {
      throw new BadRequestException("Passe introuvable");
    }

    if (pass.status !== "active") {
      throw new BadRequestException("Passe déjà utilisée ou invalide");
    }

    const now = new Date();

    if (now < pass.validFrom || now > pass.validUntil) {
      throw new BadRequestException("Passe expirée");
    }

    return this.prisma.gymSessionPass.update({
      where: { id: pass.id },
      data: {
        status: "used",
        usedAt: now,
      },
    });
  }
}
