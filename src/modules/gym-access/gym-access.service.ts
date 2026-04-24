import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymAccessService {
  constructor(private prisma: PrismaService) {}

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

    // log accès
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
