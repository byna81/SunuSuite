import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');

    return this.prisma.gymPayment.findMany({
      where: { tenantId },
      include: { member: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, body: any) {
    if (!tenantId) throw new BadRequestException('tenantId obligatoire');
    if (!body.memberId) throw new BadRequestException('Client obligatoire');
    if (!body.amount) throw new BadRequestException('Montant obligatoire');
    if (!body.method) throw new BadRequestException('Méthode obligatoire');

    const member = await this.prisma.gymMember.findFirst({
      where: { id: body.memberId, tenantId },
    });

    if (!member) throw new BadRequestException('Client introuvable');

    return this.prisma.gymPayment.create({
      data: {
        tenantId,
        memberId: body.memberId,
        amount: Number(body.amount),
        method: body.method,
      },
      include: { member: true },
    });
  }
}
