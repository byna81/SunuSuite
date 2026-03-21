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
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerManager(body: {
    boutiqueName: string;
    email: string;
    password: string;
  }) {
    const boutiqueName = body.boutiqueName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!boutiqueName || !email || !password) {
      throw new BadRequestException('Champs obligatoires manquants');
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
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'manager',
          tenantId: tenant.id,
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
        OR: [
          { email: normalizedIdentifier },
          { login: normalizedIdentifier },
        ],
      },
      include: { tenant: true },
    });

    if (!user) {
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
      code, // version test; à retirer quand l’email sera branché
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
    body: { login: string; password: string },
  ) {
    const login = body.login?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!login || !password) {
      throw new BadRequestException('Champs obligatoires manquants');
    }

    if (login.length < 4) {
      throw new BadRequestException(
        'L’identifiant doit contenir au moins 4 caractères',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ login }, { email: login }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Identifiant déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        role: 'cashier',
        tenantId,
      },
      include: {
        tenant: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        login: user.login,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name ?? null,
      },
    };
  }
}
