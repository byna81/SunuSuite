import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  private ensureManager(user: any) {
    if (!user || user.role !== 'manager') {
      throw new Error('Accès réservé au gérant');
    }
  }

  async findAll(currentUser: any) {
    this.ensureManager(currentUser);

    return this.prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        canManageProperties: true,
        canManageTenants: true,
        canManageContracts: true,
        canManageRents: true,
        canManageOwnerPayments: true,
        canViewDashboard: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(currentUser: any, id: string) {
    this.ensureManager(currentUser);

    const item = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        canManageProperties: true,
        canManageTenants: true,
        canManageContracts: true,
        canManageRents: true,
        canManageOwnerPayments: true,
        canViewDashboard: true,
      },
    });

    if (!item) {
      throw new Error('Agent introuvable');
    }

    return item;
  }

  async create(
    currentUser: any,
    body: {
      fullName?: string;
      phone?: string;
      email?: string;
      login?: string;
      password: string;
      role?: 'manager' | 'agent' | 'cashier';
      canManageProperties?: boolean;
      canManageTenants?: boolean;
      canManageContracts?: boolean;
      canManageRents?: boolean;
      canManageOwnerPayments?: boolean;
      canViewDashboard?: boolean;
    },
  ) {
    this.ensureManager(currentUser);

    const email = body.email?.trim() || null;
    const login = body.login?.trim() || null;

    if (!email && !login) {
      throw new Error('Email ou login obligatoire');
    }

    if (!body.password?.trim() || body.password.trim().length < 4) {
      throw new Error('Mot de passe trop court');
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new Error('Email déjà utilisé');
      }
    }

    if (login) {
      const existingLogin = await this.prisma.user.findUnique({
        where: { login },
      });

      if (existingLogin) {
        throw new Error('Login déjà utilisé');
      }
    }

    const hashedPassword = await bcrypt.hash(body.password.trim(), 10);
    const role = body.role || 'agent';

    return this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        fullName: body.fullName?.trim() || null,
        phone: body.phone?.trim() || null,
        email,
        login,
        password: hashedPassword,
        role,
        isActive: true,
        canManageProperties: !!body.canManageProperties,
        canManageTenants: !!body.canManageTenants,
        canManageContracts: !!body.canManageContracts,
        canManageRents: !!body.canManageRents,
        canManageOwnerPayments: !!body.canManageOwnerPayments,
        canViewDashboard: !!body.canViewDashboard,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        canManageProperties: true,
        canManageTenants: true,
        canManageContracts: true,
        canManageRents: true,
        canManageOwnerPayments: true,
        canViewDashboard: true,
      },
    });
  }

  async update(
    currentUser: any,
    id: string,
    body: {
      fullName?: string;
      phone?: string;
      email?: string;
      login?: string;
      role?: 'manager' | 'agent' | 'cashier';
      canManageProperties?: boolean;
      canManageTenants?: boolean;
      canManageContracts?: boolean;
      canManageRents?: boolean;
      canManageOwnerPayments?: boolean;
      canViewDashboard?: boolean;
    },
  ) {
    this.ensureManager(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existing) {
      throw new Error('Agent introuvable');
    }

    const email = body.email?.trim() || null;
    const login = body.login?.trim() || null;

    if (email && email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new Error('Email déjà utilisé');
      }
    }

    if (login && login !== existing.login) {
      const loginExists = await this.prisma.user.findUnique({
        where: { login },
      });

      if (loginExists) {
        throw new Error('Login déjà utilisé');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: body.fullName?.trim() || null,
        phone: body.phone?.trim() || null,
        email,
        login,
        role: body.role || existing.role,
        canManageProperties:
          typeof body.canManageProperties === 'boolean'
            ? body.canManageProperties
            : existing.canManageProperties,
        canManageTenants:
          typeof body.canManageTenants === 'boolean'
            ? body.canManageTenants
            : existing.canManageTenants,
        canManageContracts:
          typeof body.canManageContracts === 'boolean'
            ? body.canManageContracts
            : existing.canManageContracts,
        canManageRents:
          typeof body.canManageRents === 'boolean'
            ? body.canManageRents
            : existing.canManageRents,
        canManageOwnerPayments:
          typeof body.canManageOwnerPayments === 'boolean'
            ? body.canManageOwnerPayments
            : existing.canManageOwnerPayments,
        canViewDashboard:
          typeof body.canViewDashboard === 'boolean'
            ? body.canViewDashboard
            : existing.canViewDashboard,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        canManageProperties: true,
        canManageTenants: true,
        canManageContracts: true,
        canManageRents: true,
        canManageOwnerPayments: true,
        canViewDashboard: true,
      },
    });
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
      throw new Error('Agent introuvable');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        canManageProperties: true,
        canManageTenants: true,
        canManageContracts: true,
        canManageRents: true,
        canManageOwnerPayments: true,
        canViewDashboard: true,
      },
    });
  }

  async resetPassword(
    currentUser: any,
    id: string,
    body: { password: string },
  ) {
    this.ensureManager(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!existing) {
      throw new Error('Agent introuvable');
    }

    if (!body.password?.trim() || body.password.trim().length < 4) {
      throw new Error('Mot de passe trop court');
    }

    const hashedPassword = await bcrypt.hash(body.password.trim(), 10);

    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
      },
    });
  }
}
