import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AppSettingsService {
  constructor(private prisma: PrismaService) {}

  async findPublicPaymentSettings() {
    const items = await this.prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            'payment_wave_number',
            'payment_orange_number',
            'payment_recipient_name',
            'payment_instructions',
          ],
        },
      },
    });

    const result: Record<string, string> = {
      payment_wave_number: '',
      payment_orange_number: '',
      payment_recipient_name: '',
      payment_instructions: '',
    };

    for (const item of items) {
      result[item.key] = item.value;
    }

    return result;
  }

  async findAll() {
    return this.prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async upsertMany(
    body: Array<{
      key: string;
      value: string;
    }>,
  ) {
    if (!Array.isArray(body) || body.length === 0) {
      throw new BadRequestException('Aucune donnée à enregistrer');
    }

    const results = [];

    for (const item of body) {
      const key = item.key?.trim();
      const value = item.value?.trim() || '';

      if (!key) {
        throw new BadRequestException('Clé invalide');
      }

      const saved = await this.prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });

      results.push(saved);
    }

    return results;
  }
}
