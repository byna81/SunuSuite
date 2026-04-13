import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, usageType?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.owner.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(usageType ? { usageType: usageType as any } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!id?.trim()) {
      throw new BadRequestException('id obligatoire');
    }

    const owner = await this.prisma.owner.findFirst({
      where: {
        id: id.trim(),
        tenantId: tenantId.trim(),
      },
    });

    if (!owner) {
      throw new NotFoundException('Propriétaire introuvable');
    }

    return owner;
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.name?.trim()) {
      throw new BadRequestException('name obligatoire');
    }

    return this.prisma.owner.create({
      data: {
        tenantId: tenantId.trim(),
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        usageType: body.usageType || null,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    await this.findOne(tenantId, id);

    return this.prisma.owner.update({
      where: { id: id.trim() },
      data: {
        name: body.name?.trim() || undefined,
        phone:
          body.phone !== undefined ? body.phone?.trim() || null : undefined,
        email:
          body.email !== undefined ? body.email?.trim() || null : undefined,
        address:
          body.address !== undefined ? body.address?.trim() || null : undefined,
        usageType: body.usageType !== undefined ? body.usageType || null : undefined,
      },
    });
  }
}
