import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VtcDriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.vtcDriver.findMany({
      where: {
        tenantId: tenantId.trim(),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const driver = await this.prisma.vtcDriver.findFirst({
      where: {
        id,
        tenantId: tenantId.trim(),
      },
      include: {
        assignments: true,
        contracts: true,
        payments: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Chauffeur introuvable');
    }

    return driver;
  }

  async create(tenantId: string, body: any) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body?.fullName?.trim()) {
      throw new BadRequestException('fullName obligatoire');
    }

    if (!body?.phone?.trim()) {
      throw new BadRequestException('phone obligatoire');
    }

    return this.prisma.vtcDriver.create({
      data: {
        tenantId: tenantId.trim(),
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        nationalIdNumber: body.nationalIdNumber?.trim() || null,
        driverLicenseNumber: body.driverLicenseNumber?.trim() || null,
        licenseExpiryDate: body.licenseExpiryDate
          ? new Date(body.licenseExpiryDate)
          : null,
        emergencyContactName: body.emergencyContactName?.trim() || null,
        emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        status: body.status || 'actif',
        notes: body.notes?.trim() || null,
      },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    await this.findOne(tenantId, id);

    return this.prisma.vtcDriver.update({
      where: { id },
      data: {
        fullName: body.fullName?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        nationalIdNumber: body.nationalIdNumber?.trim() || null,
        driverLicenseNumber: body.driverLicenseNumber?.trim() || null,
        licenseExpiryDate: body.licenseExpiryDate
          ? new Date(body.licenseExpiryDate)
          : null,
        emergencyContactName: body.emergencyContactName?.trim() || null,
        emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        status: body.status || undefined,
        notes: body.notes?.trim() || null,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.vtcDriver.update({
      where: { id },
      data: {
        status: 'sorti',
        exitDate: new Date(),
      },
    });
  }
}
