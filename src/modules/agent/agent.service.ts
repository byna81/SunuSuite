import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

type Role = 'manager' | 'cashier' | 'agent';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  // ================================
  // SECURITY
  // ================================
  private ensureManager(user: any) {
    if (!user || user.role !== 'manager') {
      throw new ForbiddenException('Accès refusé');
    }
  }

  private normalizeRole(role?: string): Role {
    const r = String(role || 'agent').toLowerCase();

    if (!['manager', 'cashier', 'agent'].includes(r)) {
      throw new BadRequestException('Rôle invalide');
    }

    return r as Role;
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      login: user.login,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // ================================
  // GET ALL
  // ================================
  async findAll(currentUser: any) {
    this.ensureManager(currentUser);

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: users.map((u) => this.mapUser(u)),
    };
  }

  // ================================
  // GET ONE
  // ================================
  async findOne(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return this.mapUser(user);
  }

  // ================================
  // CREATE
  // ================================
  async create(currentUser: any, body: any) {
    this.ensureManager(currentUser);

    const fullName = body?.fullName?.trim();
    const email = body?.email?.trim()?.toLowerCase();
    const login = body?.login?.trim()?.toLowerCase();
    const password = body?.password?.trim();
    const role = this.normalizeRole(body?.role);

    if (!email && !login) {
      throw new BadRequestException('Email ou login obligatoire');
    }

    if (!password || password.length < 4) {
      throw new BadRequestException('Mot de passe trop court');
    }

    if (email) {
      const exists = await this.prisma.user.findFirst({ where: { email } });
      if (exists) throw new BadRequestException('Email déjà utilisé');
    }

    if (login) {
      const exists = await this.prisma.user.findFirst({ where: { login } });
      if (exists) throw new BadRequestException('Login déjà utilisé');
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        fullName,
        email,
        login,
        password: hashed,
        role,
        isActive: true,
      },
    });

    return {
      message: 'Agent créé',
      user: this.mapUser(user),
    };
  }

  // ================================
  // UPDATE
  // ================================
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

    const fullName = body?.fullName ?? existing.fullName;
    const email = body?.email ?? existing.email;
    const login = body?.login ?? existing.login;
    const role = body?.role
      ? this.normalizeRole(body.role)
      : existing.role;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName,
        email,
        login,
        role,
      },
    });

    return {
      message: 'Agent modifié',
      user: this.mapUser(updated),
    };
  }

  // ================================
  // DELETE (IMPORTANT)
  // ================================
  async delete(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Agent introuvable');
    }

    // 🔒 sécurité : éviter suppression du manager lui-même
    if (existing.id === currentUser.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Agent supprimé avec succès',
    };
  }
}
