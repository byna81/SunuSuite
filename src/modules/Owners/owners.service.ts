import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
  if (!tenantId) {
    throw new BadRequestException('tenantId obligatoire');
  }

  return this.prisma.owner.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

  return this.prisma.owner.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

    return this.prisma.owner.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, body: any) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.name) {
      throw new BadRequestException('Nom obligatoire');
    }

    return this.prisma.owner.create({
      data: {
        tenantId,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
      },
    });
  }
}
