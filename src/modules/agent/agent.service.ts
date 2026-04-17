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

      canManageProducts: !!user.canManageProducts,
      canManageStock: !!user.canManageStock,
      canViewDashboard: !!user.canViewDashboard,
    };
  }

  /////////////////////////////////////////////////////////
  // GET ALL AGENTS
  /////////////////////////////////////////////////////////
  async findAll(currentUser: any) {
    this.ensureManager(currentUser);

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId,
        role: 'agent',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: users.map((u) => this.mapUser(u)),
    };
  }

  /////////////////////////////////////////////////////////
  // GET ONE AGENT
  /////////////////////////////////////////////////////////
  async findOne(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
        role: 'agent',
      },
    });

    if (!user) {
      throw new NotFoundException('Agent introuvable');
    }

    return this.mapUser(user);
  }

  /////////////////////////////////////////////////////////
  // CREATE AGENT
  /////////////////////////////////////////////////////////
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
        role: 'agent',
        isActive: true,

        canManageProperties: !!body?.canManageProperties,
        canManageTenants: !!body?.canManageTenants,
        canManageContracts: !!body?.canManageContracts,
        canManageRents: !!body?.canManageRents,
        canManageOwnerPayments: !!body?.canManageOwnerPayments,
        canViewDashboard: !!body?.canViewDashboard,
        canAccessSale: !!body?.canAccessSale,
        canAccessRental: !!body?.canAccessRental,
        canAccessYango: !!body?.canAccessYango,
        canManageExpenses: !!body?.canManageExpenses,
        canManageAccounting: !!body?.canManageAccounting,
        canDoDataEntry: !!body?.canDoDataEntry,
        canManageVehicles: !!body?.canManageVehicles,
        canManageDrivers: !!body?.canManageDrivers,
        canManagePayments: !!body?.canManagePayments,
        canManageUsers: !!body?.canManageUsers,
        canManageProducts: !!body?.canManageProducts,
        canManageStock: !!body?.canManageStock,
          },
    });

    return {
      message: 'Agent créé avec succès',
      user: this.mapUser(user),
    };
  }

  /////////////////////////////////////////////////////////
  // UPDATE AGENT
  /////////////////////////////////////////////////////////
  async update(currentUser: any, id: string, body: any) {
    this.ensureManager(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
        role: 'agent',
      },
    });

    if (!existing) {
      throw new NotFoundException('Agent introuvable');
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
        role: 'agent',

        canManageProducts:
          body?.canManageProducts !== undefined
            ? !!body.canManageProducts
            : existing.canManageProducts,

        canManageStock:
          body?.canManageStock !== undefined
            ? !!body.canManageStock
            : existing.canManageStock,

        canViewDashboard:
          body?.canViewDashboard !== undefined
            ? !!body.canViewDashboard
            : existing.canViewDashboard,
      },
    });

    return {
      message: 'Agent modifié avec succès',
      user: this.mapUser(updated),
    };
  }

  /////////////////////////////////////////////////////////
  // ACTIVATE / DESACTIVATE
  /////////////////////////////////////////////////////////
  async toggleActive(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
        role: 'agent',
      },
    });

    if (!user) {
      throw new NotFoundException('Agent introuvable');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
    });

    return {
      message: updated.isActive
        ? 'Agent activé avec succès'
        : 'Agent désactivé avec succès',
      user: this.mapUser(updated),
    };
  }

  /////////////////////////////////////////////////////////
  // RESET PASSWORD
  /////////////////////////////////////////////////////////
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
        role: 'agent',
      },
    });

    if (!user) {
      throw new NotFoundException('Agent introuvable');
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

  /////////////////////////////////////////////////////////
  // DELETE AGENT
  /////////////////////////////////////////////////////////
  async delete(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
        role: 'agent',
      },
    });

    if (!user) {
      throw new NotFoundException('Agent introuvable');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'Agent supprimé avec succès',
    };
  }
}
