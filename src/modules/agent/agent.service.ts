import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  private ensureManager(user: any) {
    if (!user || user.role !== 'manager') {
      throw new ForbiddenException('Accès refusé');
    }
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      login: user.login,
      role: user.role,
      isActive: user.isActive,
    };
  }

  // =============================
  // LISTE
  // =============================
  async findAll(currentUser: any) {
    this.ensureManager(currentUser);

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: users.map((u) => this.mapUser(u)),
    };
  }

  // =============================
  // CREATE
  // =============================
  async create(currentUser: any, body: any) {
    this.ensureManager(currentUser);

    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('Email et mot de passe obligatoires');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        fullName: body?.fullName || null,
        email,
        password: hashed,
        role: 'agent',
        isActive: true,
      },
    });

    return this.mapUser(user);
  }

  // =============================
  // UPDATE
  // =============================
  async update(currentUser: any, id: string, body: any) {
    this.ensureManager(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: body?.fullName ?? existing.fullName,
        email: body?.email ?? existing.email,
      },
    });

    return this.mapUser(user);
  }

  // =============================
  // DELETE (IMPORTANT)
  // =============================
  async delete(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Agent supprimé',
    };
  }

  // =============================
  // TOGGLE ACTIVE (FIX BUILD)
  // =============================
  async toggleActive(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: currentUser.tenantId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    return this.mapUser(updated);
  }

  // =============================
  // RESET PASSWORD (FIX BUILD)
  // =============================
  async resetPassword(currentUser: any, id: string, body: any) {
    this.ensureManager(currentUser);

    const password = body?.password;

    if (!password || password.length < 4) {
      throw new BadRequestException('Mot de passe trop court');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: currentUser.tenantId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const hashed = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return {
      message: 'Mot de passe réinitialisé',
    };
  }
}
