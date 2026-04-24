import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class GymMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, search?: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');

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
        user: true,
        subscriptions: true,
        payments: true,
        accessLogs: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');

    const member = await this.prisma.gymMember.findFirst({
      where: { id, tenantId: tenantId.trim() },
      include: {
        user: true,
        subscriptions: true,
        payments: true,
        accessLogs: true,
      },
    });

    if (!member) throw new NotFoundException('Membre introuvable');

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
    const cleanTenantId = tenantId?.trim();
    const firstName = body?.firstName?.trim();
    const lastName = body?.lastName?.trim();
    const phone = body?.phone?.trim() || null;
    const email = body?.email?.trim()?.toLowerCase();

    if (!cleanTenantId) throw new BadRequestException('tenantId obligatoire');
    if (!firstName) throw new BadRequestException('firstName obligatoire');
    if (!lastName) throw new BadRequestException('lastName obligatoire');
    if (!email) throw new BadRequestException('email obligatoire');

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId: cleanTenantId,
        OR: [{ email }, { login: email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }

    const tempPassword = 'SunuSuite1234';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          login: email,
          password: hashedPassword,
          role: 'client',
          tenantId: cleanTenantId,
          isActive: true,
          mustChangePassword: true,
          fullName: `${firstName} ${lastName}`,
          phone,
        },
      });

      const member = await tx.gymMember.create({
        data: {
          tenant: {
            connect: { id: cleanTenantId },
          },
          user: {
            connect: { id: user.id },
          },
          firstName,
          lastName,
          phone,
          email,
          qrCode: `GYM-${randomUUID()}`,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        },
        include: {
          user: true,
        },
      });

      return { user, member };
    });

    return {
      member: result.member,
      credentials: {
        login: email,
        password: tempPassword,
        mustChangePassword: true,
      },
    };
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
          body.firstName !== undefined ? body.firstName.trim() : existing.firstName,
        lastName:
          body.lastName !== undefined ? body.lastName.trim() : existing.lastName,
        phone:
          body.phone !== undefined ? body.phone?.trim() || null : existing.phone,
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
    return this.prisma.gymMember.delete({ where: { id: existing.id } });
  }
}
