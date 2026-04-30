import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymAccessService {
  constructor(private prisma: PrismaService) {}

  async usePass(tenantId: string, body: any) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');
    if (!body.qrCode) throw new BadRequestException('QR code obligatoire');

    const pass = await this.prisma.gymSessionPass.findFirst({
      where: {
        tenantId,
        qrCode: body.qrCode,
      },
    });

    if (!pass) {
      throw new BadRequestException('Passe introuvable');
    }

    if (pass.status !== 'active') {
      throw new BadRequestException('Passe déjà utilisée ou invalide');
    }

    const now = new Date();

    if (pass.validFrom && now < pass.validFrom) {
      throw new BadRequestException('Passe pas encore valide');
    }

    if (pass.validUntil && now > pass.validUntil) {
      throw new BadRequestException('Passe expirée');
    }

    const updated = await this.prisma.gymSessionPass.update({
      where: { id: pass.id },
      data: {
        status: 'used',
        usedAt: new Date(),
      },
    });

    return {
      allowed: true,
      pass: updated,
    };
  }

  async check(qrCode: string) {
    const member = await this.prisma.gymMember.findFirst({
      where: { qrCode },
      include: {
        subscriptions: true,
      },
    });

    if (!member) {
      return { allowed: false, reason: 'Client introuvable' };
    }

    if (!member.isActive) {
      return { allowed: false, reason: 'Client désactivé' };
    }

    const now = new Date();

    const activeSubscription = member.subscriptions.find(
      (s) =>
        s.isActive &&
        new Date(s.startDate) <= now &&
        new Date(s.endDate) >= now,
    );

    if (!activeSubscription) {
      return { allowed: false, reason: 'Abonnement expiré' };
    }

    await this.prisma.gymAccessLog.create({
      data: {
        tenantId: member.tenantId,
        memberId: member.id,
      },
    });

    return {
      allowed: true,
      member: {
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        email: member.email,
        photoUrl: member.photoUrl,
      },
    };
  }
}
