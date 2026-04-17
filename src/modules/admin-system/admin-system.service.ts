import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
      },
    });

    console.log('🔥 Admin créé (admin-system)');
  }
}
