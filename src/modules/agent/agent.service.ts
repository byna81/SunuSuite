import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

type AllowedRole = 'manager' | 'cashier' | 'agent';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureManager(currentUser: any) {
    if (!currentUser || currentUser.role !== 'manager') {
      throw new ForbiddenException('Accès réservé au gérant');
    }
  }

  private normalizeRole(role?: string): AllowedRole {
    const normalized = String(role || 'agent').trim().toLowerCase();

    if (
      normalized !== 'manager' &&
      normalized !== 'cashier' &&
      normalized !== 'agent'
    ) {
      throw new BadRequestException('Rôle invalide');
    }

    return normalized as AllowedRole;
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName ?? null,
      phone: user.phone ?? null,
      email: user.email ?? null,
      login: user.login ?? null,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      canManageProperties: !!user.canManageProperties,
      canManageTenants: !!user.canManageTenants,
      canManageContracts: !!user.canManageContracts,
      canManageRents: !!user.canManageRents,
      canManageOwnerPayments: !!user.canManageOwnerPayments,
      canViewDashboard: !!user.canViewDashboard,
    };
  }

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
      items: users.map((user) => this.mapUser(user)),
    };
  }

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

  async create(currentUser: any, body: any) {
    this.ensureManager(currentUser);

    const fullName = body?.fullName?.trim() || null;
    const phone = body?.phone?.trim() || null;
    const email = body?.email?.trim()?.toLowerCase() || null;
    const login = body?.login?.trim()?.toLowerCase() || null;
    const password = body?.password?.trim();
    const role = this.normalizeRole(body?.role);

    if (!email && !login) {
      throw new BadRequestException('Email ou login obligatoire');
    }

    if (!password || password.length < 4) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 4 caractères',
      );
    }

    if (email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email },
      });

      if (emailExists) {
        throw new BadRequestException('Email déjà utilisé');
      }
    }

    if (login) {
      const loginExists = await this.prisma.user.findFirst({
        where: { login },
      });

      if (loginExists) {
        throw new BadRequestException('Login déjà utilisé');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const canManageProperties =
      role === 'manager' ? true : !!body?.canManageProperties;
    const canManageTenants =
      role === 'manager' ? true : !!body?.canManageTenants;
    const canManageContracts =
      role === 'manager' ? true : !!body?.canManageContracts;
    const canManageRents = role === 'manager' ? true : !!body?.canManageRents;
    const canManageOwnerPayments =
      role === 'manager' ? true : !!body?.canManageOwnerPayments;
    const canViewDashboard =
      role === 'manager' ? true : !!body?.canViewDashboard;

    const created = await this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        fullName,
        phone,
        email,
        login,
        password: hashedPassword,
        role,
        isActive: true,
        canManageProperties,
        canManageTenants,
        canManageContracts,
        canManageRents,
        canManageOwnerPayments,
        canViewDashboard,
      },
    });

    return {
      message: 'Utilisateur créé avec succès',
      user: this.mapUser(created),
    };
  }

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

    const fullName =
      typeof body?.fullName === 'string' ? body.fullName.trim() || null : existing.fullName;
    const phone =
      typeof body?.phone === 'string' ? body.phone.trim() || null : existing.phone;
    const email =
      typeof body?.email === 'string'
        ? body.email.trim().toLowerCase() || null
        : existing.email;
    const login =
      typeof body?.login === 'string'
        ? body.login.trim().toLowerCase() || null
        : existing.login;

    const role =
      typeof body?.role === 'string'
        ? this.normalizeRole(body.role)
        : (existing.role as AllowedRole);

    if (!email && !login) {
      throw new BadRequestException('Email ou login obligatoire');
    }

    if (email && email !== existing.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email },
      });

      if (emailExists) {
        throw new BadRequestException('Email déjà utilisé');
      }
    }

    if (login && login !== existing.login) {
      const loginExists = await this.prisma.user.findFirst({
        where: { login },
      });

      if (loginExists) {
        throw new BadRequestException('Login déjà utilisé');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName,
        phone,
        email,
        login,
        role,
        canManageProperties:
          role === 'manager' ? true : !!body?.canManageProperties,
        canManageTenants:
          role === 'manager' ? true : !!body?.canManageTenants,
        canManageContracts:
          role === 'manager' ? true : !!body?.canManageContracts,
        canManageRents: role === 'manager' ? true : !!body?.canManageRents,
        canManageOwnerPayments:
          role === 'manager' ? true : !!body?.canManageOwnerPayments,
        canViewDashboard:
          role === 'manager' ? true : !!body?.canViewDashboard,
      },
    });

    return {
      message: 'Utilisateur mis à jour avec succès',
      user: this.mapUser(updated),
    };
  }

  async toggleActive(currentUser: any, id: string) {
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

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
    });

    return {
      message: updated.isActive
        ? 'Utilisateur activé avec succès'
        : 'Utilisateur désactivé avec succès',
      user: this.mapUser(updated),
    };
  }

  async resetPassword(currentUser: any, id: string, body: any) {
    this.ensureManager(currentUser);

    const password = body?.password?.trim();

    if (!password || password.length < 4) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 4 caractères',
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Mot de passe réinitialisé avec succès',
    };
  }
}
