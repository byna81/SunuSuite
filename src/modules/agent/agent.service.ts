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
      fullName: user.fullName ?? null,
      phone: user.phone ?? null,
      email: user.email ?? null,
      login: user.login ?? null,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
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
      items: users.map((u) => this.mapUser(u)),
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

    const user = await this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        fullName,
        phone,
        email,
        login,
        password: hashedPassword,
        role: body?.role || 'agent',
        isActive: true,
      },
    });

    return {
      message: 'Agent créé avec succès',
      user: this.mapUser(user),
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
      typeof body?.fullName === 'string'
        ? body.fullName.trim() || null
        : existing.fullName;

    const phone =
      typeof body?.phone === 'string'
        ? body.phone.trim() || null
        : existing.phone;

    const email =
      typeof body?.email === 'string'
        ? body.email.trim().toLowerCase() || null
        : existing.email;

    const login =
      typeof body?.login === 'string'
        ? body.login.trim().toLowerCase() || null
        : existing.login;

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
        role: body?.role ?? existing.role,
      },
    });

    return {
      message: 'Utilisateur modifié avec succès',
      user: this.mapUser(updated),
    };
  }

  async toggleActive(currentUser: any, id: string) {
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

    if (user.role === 'manager' && user.id === currentUser.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas désactiver votre propre compte',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
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

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!user) {
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

  async delete(currentUser: any, id: string) {
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

    if (user.role === 'manager' && user.id === currentUser.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Utilisateur supprimé avec succès',
    };
  }
}
