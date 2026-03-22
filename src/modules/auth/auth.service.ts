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

  // =========================
  // REGISTER MANAGER
  // =========================
  async registerManager(body: any) {
    const {
      boutiqueName,
      email,
      password,
      logoUrl,
      address,
      phone,
      shopEmail,
      description,
      currency,
    } = body;

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
          logoUrl: logoUrl || null,
          address: address || null,
          phone: phone || null,
          email: shopEmail || null,
          description: description || null,
          currency: currency || 'FCFA',
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'manager',
          tenantId: tenant.id,
        },
        include: { tenant: true },
      });

      return { tenant, user };
    });

    const payload = {
      sub: result.user.id,
      role: result.user.role,
      tenantId: result.user.tenantId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        tenantId: result.user.tenantId,

        tenantName: result.tenant.name,
        tenantLogoUrl: result.tenant.logoUrl,
        tenantAddress: result.tenant.address,
        tenantPhone: result.tenant.phone,
        tenantCurrency: result.tenant.currency,
      },
    };
  }

  // =========================
  // LOGIN
  // =========================
  async login(identifier: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { login: identifier }],
      },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException();

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException();

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        role: user.role,
        tenantId: user.tenantId,

        tenantName: user.tenant?.name,
        tenantLogoUrl: user.tenant?.logoUrl,
        tenantAddress: user.tenant?.address,
        tenantPhone: user.tenant?.phone,
        tenantCurrency: user.tenant?.currency,
      },
    };
  }

  // =========================
  // FORGOT PASSWORD
  // =========================
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, role: 'manager' },
    });

    if (!user) throw new BadRequestException('Utilisateur introuvable');

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { code }; // temporaire
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user || user.resetCode !== code) {
      throw new BadRequestException('Code invalide');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });

    return { message: 'Mot de passe mis à jour' };
  }

  // =========================
  // CASHIERS
  // =========================
  async getCashiers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: 'cashier' },
      orderBy: { createdAt: 'desc' },
    });

    return { items: users };
  }

  async registerCashier(tenantId: string) {
    const login = Math.random().toString(36).substring(2, 8);
    const password = Math.random().toString(36).substring(2, 8);

    const hashed = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        login,
        password: hashed,
        role: 'cashier',
        tenantId,
      },
    });

    return { login, password };
  }

  async resetCashierPassword(id: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return { message: 'ok' };
  }

  async deactivateCashier(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'désactivé' };
  }
}
