import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminSystemService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.createDefaultAdminIfNotExists();
  }

  private async createDefaultAdminIfNotExists() {
    const existing = await this.prisma.user.findFirst({
      where: { role: 'admin' as any },
    });

    if (existing) {
      console.log('✅ Admin déjà existant');
      return;
    }

    let tenant = await this.prisma.tenant.findFirst({
      where: { slug: 'admin-system' },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'Admin System',
          slug: 'admin-system',
          sector: 'services',
          currency: 'FCFA',
          isActive: true,
        },
      });
    }

    const hashed = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'Admin1234',
      10,
    );

    await this.prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@sunusuite.com',
        login: process.env.ADMIN_LOGIN || 'admin',
        password: hashed,
        role: 'admin' as any,
        isActive: true,
        mustChangePassword: false,
        fullName: 'Admin SunuSuite',
        tenantId: tenant.id,
      },
    });

    console.log('🔥 Admin créé (admin-system)');
  }

  async getDashboard() {
    const [tenantsCount, subscriptionsCount, pendingRequestsCount] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.subscription.count(),
        this.prisma.businessRequest.count({
          where: { status: 'pending' as any },
        }),
      ]);

    return {
      tenantsCount,
      subscriptionsCount,
      pendingRequestsCount,
    };
  }
}
