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

    if (!pass) throw new BadRequestException('Passe introuvable');

    if (pass.status !== 'active') {
      throw new BadRequestException('Passe déjà utilisée ou invalide');
    }

    const now = new Date();

    if (now < pass.validFrom) {
      throw new BadRequestException('Passe pas encore valide');
    }

    if (now > pass.validUntil) {
      throw new BadRequestException('Passe expirée');
    }

    const updated = await this.prisma.gymSessionPass.update({
      where: { id: pass.id },
      data: {
        status: 'used',
        usedAt: now,
      },
    });

    return {
      allowed: true,
      type: 'session_pass',
      pass: updated,
    };
  }

  async check(qrCode: string, tenantId: string) {
    if (!qrCode) throw new BadRequestException('qrCode obligatoire');
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');

    const now = new Date();

    // 1) Vérifier d'abord les passes journée
    const pass = await this.prisma.gymSessionPass.findFirst({
      where: {
        qrCode,
        tenantId,
      },
    });

    if (pass) {
      if (pass.status !== 'active') {
        return {
          allowed: false,
          type: 'session_pass',
          reason: 'Passe déjà utilisée ou invalide',
        };
      }

      if (now < pass.validFrom) {
        return {
          allowed: false,
          type: 'session_pass',
          reason: 'Passe pas encore valide',
        };
      }

      if (now > pass.validUntil) {
        return {
          allowed: false,
          type: 'session_pass',
          reason: 'Passe expirée',
        };
      }

      const updated = await this.prisma.gymSessionPass.update({
        where: { id: pass.id },
        data: {
          status: 'used',
          usedAt: now,
        },
      });

      return {
        allowed: true,
        type: 'session_pass',
        pass: updated,
      };
    }

    // 2) Sinon vérifier les clients / abonnements
    const member = await this.prisma.gymMember.findFirst({
      where: {
        qrCode,
        tenantId,
      },
      include: {
        subscriptions: true,
      },
    });

    if (!member) {
      return { allowed: false, reason: 'QR invalide' };
    }

    if (!member.isActive) {
      return { allowed: false, reason: 'Client désactivé' };
    }

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
      type: 'subscription',
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
