import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, search?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.gymMember.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(search?.trim()
          ? {
              OR: [
                { firstName: { contains: search.trim(), mode: 'insensitive' } },
                { lastName: { contains: search.trim(), mode: 'insensitive' } },
                { phone: { contains: search.trim(), mode: 'insensitive' } },
                { email: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: true,
        payments: true,
        accessLogs: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const member = await this.prisma.gymMember.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        subscriptions: true,
        payments: true,
        accessLogs: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }

    return member;
  }

  async create(
    tenantId: string,
    body: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
    },
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.firstName?.trim()) {
      throw new BadRequestException('firstName obligatoire');
    }

    if (!body?.lastName?.trim()) {
      throw new BadRequestException('lastName obligatoire');
    }

    return this.prisma.gymMember.create({
      data: {
        tenantId: tenantId.trim(),
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim()?.toLowerCase() || null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      email?: string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await this.findOne(tenantId, id);

    return this.prisma.gymMember.update({
      where: { id: existing.id },
      data: {
        firstName:
          body.firstName !== undefined
            ? body.firstName.trim()
            : existing.firstName,
        lastName:
          body.lastName !== undefined
            ? body.lastName.trim()
            : existing.lastName,
        phone:
          body.phone !== undefined
            ? body.phone?.trim() || null
            : existing.phone,
        email:
          body.email !== undefined
            ? body.email?.trim()?.toLowerCase() || null
            : existing.email,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    return this.prisma.gymMember.delete({
      where: { id: existing.id },
    });
  }
}
