import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
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

    if (!price || !validFrom || !validUntil) {
      throw new BadRequestException("Champs obligatoires manquants");
    }

    const passes = [];

    for (let i = 0; i < (quantity || 1); i++) {
      passes.push({
        tenantId,
        buyerName,
        buyerPhone,
        price: Number(price),
        quantity: 1,
        paymentMethod: paymentMethod || "cash",
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        qrCode: randomUUID(),
        soldByUserId,
        soldByUserName,
      });
    }

    const created = await this.prisma.gymSessionPass.createMany({
      data: passes,
    });

    // 🔥 IMPORTANT → créer aussi un paiement (comptabilité)
    await this.prisma.payment.create({
      data: {
        tenantId,
        amount: Number(price) * (quantity || 1),
        method: paymentMethod || "cash",
        status: "paid",
        description: "Vente passes séance",
        type: "session_pass",
      },
    });

    return { success: true, count: created.count };
  }

  async validate(qrCode: string, tenantId: string) {
    const pass = await this.prisma.gymSessionPass.findFirst({
      where: { qrCode, tenantId },
    });

    if (!pass) throw new BadRequestException("Passe introuvable");

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

    if (!pass) throw new BadRequestException("Passe introuvable");

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
        usedAt: new Date(),
      },
    });
  }
}
