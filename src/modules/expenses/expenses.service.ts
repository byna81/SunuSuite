import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, module?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.expense.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(module ? { module: module as any } : {}),
      },
      include: {
        vehicle: true,
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const item = await this.prisma.expense.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        vehicle: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Dépense introuvable');
    }

    return item;
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.module) {
      throw new BadRequestException('module obligatoire');
    }

    if (!body?.label?.trim()) {
      throw new BadRequestException('label obligatoire');
    }

    if (body?.amount === undefined || body?.amount === null || Number(body.amount) <= 0) {
      throw new BadRequestException('amount obligatoire et doit être supérieur à 0');
    }

    if (!body?.expenseDate) {
      throw new BadRequestException('expenseDate obligatoire');
    }

    if (body?.vehicleId?.trim()) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: body.vehicleId.trim(),
          tenantId: tenantId.trim(),
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Véhicule introuvable');
      }
    }

    return this.prisma.expense.create({
      data: {
        tenantId: tenantId.trim(),
        module: body.module,
        category: body.category || 'other',
        label: body.label.trim(),
        amount: Number(body.amount || 0),
        expenseDate: new Date(body.expenseDate),
        vehicleId: body.vehicleId?.trim() || null,
        note: body.note?.trim() || null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    await this.findOne(tenantId, id);

    if (body?.vehicleId?.trim()) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: body.vehicleId.trim(),
          tenantId: tenantId.trim(),
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Véhicule introuvable');
      }
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        module: body.module || undefined,
        category: body.category || undefined,
        label: body.label !== undefined ? body.label.trim() : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        expenseDate:
          body.expenseDate !== undefined
            ? new Date(body.expenseDate)
            : undefined,
        vehicleId:
          body.vehicleId !== undefined
            ? body.vehicleId?.trim() || null
            : undefined,
        note:
          body.note !== undefined
            ? body.note?.trim() || null
            : undefined,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
