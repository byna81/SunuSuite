import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerManager(body: any) {
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        sector: body.sector || 'commerce', // 👈 important
      },
    });

    const user = await this.prisma.user.create({
      data: {
        login: body.email,
        password: hashedPassword,
        role: 'manager',
        tenantId: tenant.id,
      },
    });

    return {
      message: 'Manager créé',
      tenant,
      user,
    };
  }

  async login(identifier: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        login: identifier,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      sector: user.tenant.sector, // 👈 clé importante
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        role: user.role,
        tenantId: user.tenantId,
        sector: user.tenant.sector,
      },
    };
  }

  async registerCashier(
    tenantId: string,
    login: string,
    password: string,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        login,
        password: hashedPassword,
        role: 'cashier',
        tenantId,
      },
    });
  }

  async getCashiers(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: 'cashier',
      },
      select: {
        id: true,
        login: true,
        createdAt: true,
        active: true,
      },
    });
  }

  async resetCashierPassword(
    tenantId: string,
    id: string,
    newPassword: string,
  ) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async deactivateCashier(tenantId: string, id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }

  async forgotPassword(email: string) {
    return { message: 'Fonction à implémenter' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    return { message: 'Fonction à implémenter' };
  }
}
