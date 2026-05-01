import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';

const TEMP_PASSWORD = 'SunuSuite1234';

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private buildUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      login: user.login,
      fullName: user.fullName ?? null,
      phone: user.phone ?? null,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: !!user.mustChangePassword,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? null,
      tenantSlug: user.tenant?.slug ?? null,
      tenantLogoUrl: user.tenant?.logoUrl ?? null,
      tenantAddress: user.tenant?.address ?? null,
      tenantPhone: user.tenant?.phone ?? null,
      tenantEmail: user.tenant?.email ?? null,
      tenantCurrency: user.tenant?.currency ?? 'FCFA',
      tenantSector: user.tenant?.sector ?? null,

      canManageProperties: !!user.canManageProperties,
      canManageTenants: !!user.canManageTenants,
      canManageContracts: !!user.canManageContracts,
      canManageRents: !!user.canManageRents,
      canManageOwnerPayments: !!user.canManageOwnerPayments,
      canViewDashboard: !!user.canViewDashboard,

      canAccessSale: !!user.canAccessSale,
      canAccessRental: !!user.canAccessRental,
      canAccessYango: !!user.canAccessYango,
      canManageExpenses: !!user.canManageExpenses,
      canManageAccounting: !!user.canManageAccounting,
      canDoDataEntry: !!user.canDoDataEntry,
      canManageVehicles: !!user.canManageVehicles,
      canManageDrivers: !!user.canManageDrivers,
      canManagePayments: !!user.canManagePayments,
      canManageUsers: !!user.canManageUsers,
      canManageProducts: !!user.canManageProducts,
      canManageStock: !!user.canManageStock,

      canGymManageMembers: !!user.canGymManageMembers,
      canGymManageCoaches: !!user.canGymManageCoaches,
      canGymManageCourses: !!user.canGymManageCourses,
      canGymManageSubscriptions: !!user.canGymManageSubscriptions,
      canGymManagePayments: !!user.canGymManagePayments,
      canGymScanAccess: !!user.canGymScanAccess,
      canGymManagePlans: !!user.canGymManagePlans,
      canGymManageProducts: !!user.canGymManageProducts,
      canGymAccessCashier: !!user.canGymAccessCashier,
    };
  }

  private async buildAuthResponse(user: any) {
    const payload = this.buildUserResponse(user);

    const accessToken = await this.jwtService.signAsync({
      ...payload,
      sub: user.id,
    });

    return {
      accessToken,
      mustChangePassword: !!user.mustChangePassword,
      user: payload,
    };
  }

  async registerManager(body: any) {
    const boutiqueName = body.boutiqueName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    const logoUrl = body.logoUrl?.trim() || null;
    const address = body.address?.trim() || null;
    const phone = body.phone?.trim() || null;
    const shopEmail = body.shopEmail?.trim().toLowerCase() || null;
    const description = body.description?.trim() || null;
    const currency = body.currency?.trim() || 'FCFA';
    const sector = body.sector?.trim() || 'commerce';

    if (!boutiqueName || !email || !password) {
      throw new BadRequestException('Champs obligatoires manquants');
    }

    if (password.length < 6) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 6 caractères',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { login: email }] },
    });

    if (existingUser) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const baseSlug = generateSlug(boutiqueName) || 'structure';
    let slug = baseSlug;
    let i = 1;

    while (await this.prisma.tenant.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: boutiqueName,
          slug,
          logoUrl,
          address,
          phone,
          email: shopEmail,
          description,
          currency,
          sector,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          login: email,
          password: hashedPassword,
          role: 'manager',
          tenantId: tenant.id,
          isActive: true,
          mustChangePassword: false,

          canViewDashboard: true,
          canManageUsers: true,
          canManagePayments: true,
          canManageProducts: true,
          canManageStock: true,
          canManageExpenses: true,

          canManageProperties: true,
          canManageTenants: true,
          canManageContracts: true,
          canManageRents: true,
          canManageOwnerPayments: true,

          canGymManageMembers: true,
          canGymManageCoaches: true,
          canGymManageCourses: true,
          canGymManageSubscriptions: true,
          canGymManagePayments: true,
          canGymScanAccess: true,
          canGymManagePlans: true,
          canGymManageProducts: true,
          canGymAccessCashier: true,
        },
        include: { tenant: true },
      });

      return { tenant, user };
    });

    return this.buildAuthResponse(result.user);
  }

  async login(identifier: string, password: string) {
    const normalizedIdentifier = identifier?.trim().toLowerCase();
    const rawPassword = password?.trim();

    if (!normalizedIdentifier || !rawPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const looksLikeEmail = normalizedIdentifier.includes('@');

    if (looksLikeEmail) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: normalizedIdentifier }, { login: normalizedIdentifier }],
        },
        include: { tenant: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Identifiants invalides');
      }

      const isPasswordValid = await bcrypt.compare(rawPassword, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Identifiants invalides');
      }

      return this.buildAuthResponse(user);
    }

    const users = await this.prisma.user.findMany({
      where: {
        login: normalizedIdentifier,
        isActive: true,
      },
      include: { tenant: true },
    });

    for (const user of users) {
      const isPasswordValid = await bcrypt.compare(rawPassword, user.password);

      if (isPasswordValid) {
        return this.buildAuthResponse(user);
      }
    }

    throw new UnauthorizedException('Identifiants invalides');
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new BadRequestException('Email requis');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: 'manager',
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new BadRequestException('Aucun manager trouvé avec cet email');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpiresAt: expiresAt,
      },
    });

    await this.mailService.sendPasswordResetEmail({
      to: normalizedEmail,
      ownerName: user.fullName || user.tenant?.name || 'Manager',
      code,
    });

    return { message: 'Un email de réinitialisation a été envoyé' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedCode = code?.trim();
    const rawPassword = newPassword?.trim();

    if (!normalizedEmail || !normalizedCode || !rawPassword) {
      throw new BadRequestException('Champs obligatoires manquants');
    }

    if (rawPassword.length < 6) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 6 caractères',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: 'manager',
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (!user.resetCode || !user.resetCodeExpiresAt) {
      throw new BadRequestException('Aucune demande de réinitialisation active');
    }

    if (user.resetCode !== normalizedCode) {
      throw new BadRequestException('Code invalide');
    }

    if (new Date(user.resetCodeExpiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Code expiré');
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const rawCurrentPassword = currentPassword?.trim();
    const rawNewPassword = newPassword?.trim();

    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    if (!rawCurrentPassword || !rawNewPassword) {
      throw new BadRequestException('Champs obligatoires manquants');
    }

    if (rawNewPassword.length < 6) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit contenir au moins 6 caractères',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    const isPasswordValid = await bcrypt.compare(
      rawCurrentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Mot de passe actuel invalide');
    }

    const hashedPassword = await bcrypt.hash(rawNewPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });

    const refreshedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true },
    });

    return {
      message: 'Mot de passe modifié avec succès',
      user: this.buildUserResponse(refreshedUser),
    };
  }

  async registerCashier(tenantId: string, login: string, password: string) {
    const normalizedLogin = login?.trim().toLowerCase();
    const rawPassword = password?.trim();

    if (!normalizedLogin || !rawPassword) {
      throw new BadRequestException('Identifiant et mot de passe obligatoires');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: [{ login: normalizedLogin }, { email: normalizedLogin }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Cet identifiant de caisse existe déjà dans cette boutique',
      );
    }

    const hashed = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        login: normalizedLogin,
        password: hashed,
        role: 'cashier',
        tenantId,
        isActive: true,
        mustChangePassword: false,
        canManageRents: true,
      },
      include: { tenant: true },
    });

    return { user: this.buildUserResponse(user) };
  }

  async getCashiers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: 'cashier' },
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });

    return { items: users.map((user) => this.buildUserResponse(user)) };
  }

  async resetCashierPassword(
    tenantId: string,
    id: string,
    newPassword: string,
  ) {
    const rawPassword = newPassword?.trim();

    if (!rawPassword || rawPassword.length < 4) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit contenir au moins 4 caractères',
      );
    }

    const cashier = await this.prisma.user.findFirst({
      where: { id, tenantId, role: 'cashier' },
    });

    if (!cashier) {
      throw new BadRequestException('Caisse introuvable');
    }

    const hashed = await bcrypt.hash(rawPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashed,
        mustChangePassword: false,
      },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async deactivateCashier(tenantId: string, id: string) {
    const cashier = await this.prisma.user.findFirst({
      where: { id, tenantId, role: 'cashier' },
    });

    if (!cashier) {
      throw new BadRequestException('Caisse introuvable');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Caisse désactivée avec succès' };
  }

  async registerStaff(tenantId: string, body: any) {
    const normalizedTenantId = tenantId?.trim();
    const login = body.login?.trim().toLowerCase();
    const password = body.password?.trim() || TEMP_PASSWORD;
    const email = body.email?.trim().toLowerCase() || null;

    if (!normalizedTenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!login) {
      throw new BadRequestException('Login obligatoire');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: normalizedTenantId,
        OR: [{ login }, ...(email ? [{ email }] : [])],
      },
    });

    if (existing) {
      throw new BadRequestException('Utilisateur déjà existant');
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: body.fullName?.trim() || null,
        email,
        login,
        password: hashed,
        role: (body.role || 'agent') as any,
        tenantId: normalizedTenantId,
        isActive: true,
        mustChangePassword: true,

        canViewDashboard: !!body.canViewDashboard,
        canManageUsers: !!body.canManageUsers,
        canManagePayments: !!body.canManagePayments,
        canManageProducts: !!body.canManageProducts,
        canManageStock: !!body.canManageStock,
        canManageExpenses: !!body.canManageExpenses,

        canGymManageMembers: !!body.canGymManageMembers,
        canGymManageCoaches: !!body.canGymManageCoaches,
        canGymManageCourses: !!body.canGymManageCourses,
        canGymManageSubscriptions: !!body.canGymManageSubscriptions,
        canGymManagePayments: !!body.canGymManagePayments,
        canGymScanAccess: !!body.canGymScanAccess,
        canGymManagePlans: !!body.canGymManagePlans,
        canGymManageProducts: !!body.canGymManageProducts,
        canGymAccessCashier: !!body.canGymAccessCashier,
      },
      include: { tenant: true },
    });

    return this.buildUserResponse(user);
  }

  async getStaff(tenantId: string) {
    const normalizedTenantId = tenantId?.trim();

    if (!normalizedTenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: normalizedTenantId,
        role: { in: ['agent', 'coach', 'staff', 'cashier'] as any },
      },
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.buildUserResponse(user));
  }

  async updateStaff(tenantId: string, id: string, body: any) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: ['agent', 'coach', 'staff', 'cashier'] as any },
      },
    });

    if (!existing) {
      throw new BadRequestException('Agent introuvable');
    }

    const email = body.email?.trim().toLowerCase() || null;
    const login = body.login?.trim().toLowerCase();

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: body.fullName?.trim() || existing.fullName,
        email,
        login: login || existing.login,

        canViewDashboard: !!body.canViewDashboard,
        canManageUsers: !!body.canManageUsers,
        canManagePayments: !!body.canManagePayments,
        canManageProducts: !!body.canManageProducts,
        canManageStock: !!body.canManageStock,
        canManageExpenses: !!body.canManageExpenses,

        canGymManageMembers: !!body.canGymManageMembers,
        canGymManageCoaches: !!body.canGymManageCoaches,
        canGymManageCourses: !!body.canGymManageCourses,
        canGymManageSubscriptions: !!body.canGymManageSubscriptions,
        canGymManagePayments: !!body.canGymManagePayments,
        canGymScanAccess: !!body.canGymScanAccess,
        canGymManagePlans: !!body.canGymManagePlans,
        canGymManageProducts: !!body.canGymManageProducts,
        canGymAccessCashier: !!body.canGymAccessCashier,
      },
      include: { tenant: true },
    });
  }

  async activateStaff(tenantId: string, id: string) {
    return this.setStaffActive(tenantId, id, true);
  }

  async deactivateStaff(tenantId: string, id: string) {
    return this.setStaffActive(tenantId, id, false);
  }

  private async setStaffActive(tenantId: string, id: string, isActive: boolean) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: ['agent', 'coach', 'staff', 'cashier'] as any },
      },
    });

    if (!existing) {
      throw new BadRequestException('Agent introuvable');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    return { message: isActive ? 'Agent activé' : 'Agent désactivé' };
  }

  async resetStaffPassword(tenantId: string, id: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: ['agent', 'coach', 'staff', 'cashier'] as any },
      },
    });

    if (!existing) {
      throw new BadRequestException('Agent introuvable');
    }

    const hashed = await bcrypt.hash(TEMP_PASSWORD, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashed,
        mustChangePassword: true,
      },
    });

    return {
      message: 'Mot de passe réinitialisé',
      password: TEMP_PASSWORD,
    };
  }

  async deleteStaff(tenantId: string, id: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: { in: ['agent', 'coach', 'staff', 'cashier'] as any },
      },
    });

    if (!existing) {
      throw new BadRequestException('Agent introuvable');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Agent supprimé' };
  }
}
