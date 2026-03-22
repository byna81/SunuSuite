import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerManager(body: {
    boutiqueName: string;
    email: string;
    password: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    shopEmail?: string;
    description?: string;
    currency?: string;
    sector?: string;
  }) {
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
      where: {
        OR: [{ email }, { login: email }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: boutiqueName,
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
          password: hashedPassword,
          role: 'manager',
          tenantId: tenant.id,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      return { tenant, user };
    });

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      login: result.user.login,
      role: result.user.role,
      tenantId: result.user.tenantId,
      tenantName: result.user.tenant?.name ?? null,
      tenantLogoUrl: result.user.tenant?.logoUrl ?? null,
      tenantAddress: result.user.tenant?.address ?? null,
      tenantPhone: result.user.tenant?.phone ?? null,
      tenantEmail: result.user.tenant?.email ?? null,
      tenantCurrency: result.user.tenant?.currency ?? 'FCFA',
      tenantSector: result.user.tenant?.sector ?? 'commerce',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        login: result.user.login,
        role: result.user.role,
        tenantId: result.user.tenantId,
        tenantName: result.user.tenant?.name ?? null,
        tenantLogoUrl: result.user.tenant?.logoUrl ?? null,
        tenantAddress: result.user.tenant?.address ?? null,
        tenantPhone: result.user.tenant?.phone ?? null,
        tenantEmail: result.user.tenant?.email ?? null,
        tenantCurrency: result.user.tenant?.currency ?? 'FCFA',
        tenantSector: result.user.tenant?.sector ?? 'commerce',
      },
    };
  }

  async login(identifier: string, password: string) {
    const normalizedIdentifier = identifier?.trim().toLowerCase();
    const rawPassword = password?.trim();

    if (!normalizedIdentifier || !rawPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

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

    const payload = {
      sub: user.id,
      email: user.email,
      login: user.login,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? null,
      tenantLogoUrl: user.tenant?.logoUrl ?? null,
      tenantAddress: user.tenant?.address ?? null,
      tenantPhone: user.tenant?.phone ?? null,
      tenantEmail: user.tenant?.email ?? null,
      tenantCurrency: user.tenant?.currency ?? 'FCFA',
      tenantSector: user.tenant?.sector ?? 'commerce',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        login: user.login,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name ?? null,
        tenantLogoUrl: user.tenant?.logoUrl ?? null,
        tenantAddress: user.tenant?.address ?? null,
        tenantPhone: user.tenant?.phone ?? null,
        tenantEmail: user.tenant?.email ?? null,
        tenantCurrency: user.tenant?.currency ?? 'FCFA',
        tenantSector: user.tenant?.sector ?? 'commerce',
      },
    };
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

    return {
      message: 'Code de réinitialisation généré',
      code,
      expiresAt,
    };
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
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });

    return {
      message: 'Mot de passe réinitialisé avec succès',
    };
  }

  async registerCashier(
    tenantId: string,
    login: string,
    password: string,
  ) {
    const normalizedLogin = login?.trim().toLowerCase();
    const rawPassword = password?.trim();

    if (!normalizedLogin || !rawPassword) {
      throw new BadRequestException('Identifiant et mot de passe obligatoires');
    }

    if (normalizedLogin.length < 3) {
      throw new BadRequestException(
        'L’identifiant de caisse doit contenir au moins 3 caractères',
      );
    }

    if (rawPassword.length < 4) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 4 caractères',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ login: normalizedLogin }, { email: normalizedLogin }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Cet identifiant de caisse existe déjà');
    }

    const hashed = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        login: normalizedLogin,
        password: hashed,
        role: 'cashier',
        tenantId,
        isActive: true,
      },
    });

    return {
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async getCashiers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: 'cashier',
      },
      orderBy: { createdAt: 'desc' },
    });

    return { items: users };
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
      where: {
        id,
        tenantId,
        role: 'cashier',
      },
    });

    if (!cashier) {
      throw new BadRequestException('Caisse introuvable');
    }

    const hashed = await bcrypt.hash(rawPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async deactivateCashier(tenantId: string, id: string) {
    const cashier = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        role: 'cashier',
      },
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
}
