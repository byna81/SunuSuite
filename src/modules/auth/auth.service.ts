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

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
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
        role: result.user.role,
        tenantId: result.user.tenantId,
        tenantName: result.user.tenant?.name ?? null,
      },
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const rawPassword = password?.trim();

    if (!normalizedEmail || !rawPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
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
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name ?? null,
      },
    };
  }

  async registerCashier(
    tenantId: string,
    body: { email: string; password: string },
  ) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('Champs obligatoires manquants');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
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
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name ?? null,
      },
    };
  }
}
