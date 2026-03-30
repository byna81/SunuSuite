import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleCustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicleCustomer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.vehicleCustomer.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      throw new BadRequestException('Client introuvable');
    }

    return item;
  }

  async create(
    tenantId: string,
    body: {
      fullName: string;
      phone: string;
      email?: string;
      address?: string;
      idCardNumber?: string;
      driverLicenseNumber?: string;
      notes?: string;
    },
  ) {
    if (!body.fullName?.trim()) {
      throw new BadRequestException('Le nom complet est obligatoire');
    }

    if (!body.phone?.trim()) {
      throw new BadRequestException('Le téléphone est obligatoire');
    }

    const phone = body.phone.trim();

    const existing = await this.prisma.vehicleCustomer.findFirst({
      where: {
        tenantId,
        phone,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Un client avec ce numéro existe déjà',
      );
    }

    return this.prisma.vehicleCustomer.create({
      data: {
        tenantId,
        fullName: body.fullName.trim(),
        phone,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        idCardNumber: body.idCardNumber?.trim() || null,
        driverLicenseNumber: body.driverLicenseNumber?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    body: {
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
      idCardNumber?: string;
      driverLicenseNumber?: string;
      notes?: string;
    },
  ) {
    const existing = await this.prisma.vehicleCustomer.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new BadRequestException('Client introuvable');
    }

    const phone =
      typeof body.phone === 'string'
        ? body.phone.trim()
        : existing.phone;

    if (!phone) {
      throw new BadRequestException('Le téléphone est obligatoire');
    }

    const duplicate = await this.prisma.vehicleCustomer.findFirst({
      where: {
        tenantId,
        phone,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Un client avec ce numéro existe déjà',
      );
    }

    return this.prisma.vehicleCustomer.update({
      where: { id },
      data: {
        fullName:
          typeof body.fullName === 'string'
            ? body.fullName.trim()
            : existing.fullName,
        phone,
        email:
          typeof body.email === 'string'
            ? body.email.trim() || null
            : existing.email,
        address:
          typeof body.address === 'string'
            ? body.address.trim() || null
            : existing.address,
        idCardNumber:
          typeof body.idCardNumber === 'string'
            ? body.idCardNumber.trim() || null
            : existing.idCardNumber,
        driverLicenseNumber:
          typeof body.driverLicenseNumber === 'string'
            ? body.driverLicenseNumber.trim() || null
            : existing.driverLicenseNumber,
        notes:
          typeof body.notes === 'string'
            ? body.notes.trim() || null
            : existing.notes,
      },
    });
  }
}
