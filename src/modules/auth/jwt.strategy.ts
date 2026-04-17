import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change_me_super_secret',
    });
  }

  async validate(payload: any) {
  return {
    // compat existante
    userId: payload.sub,
    email: payload.email ?? null,
    login: payload.login ?? null,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantName: payload.tenantName ?? null,

    // ajout utile
    id: payload.sub,
    sub: payload.sub,
    fullName: payload.fullName ?? null,
    phone: payload.phone ?? null,
    isActive: payload.isActive ?? true,
    mustChangePassword: !!payload.mustChangePassword,
    tenantSlug: payload.tenantSlug ?? null,
    tenantLogoUrl: payload.tenantLogoUrl ?? null,
    tenantAddress: payload.tenantAddress ?? null,
    tenantPhone: payload.tenantPhone ?? null,
    tenantEmail: payload.tenantEmail ?? null,
    tenantCurrency: payload.tenantCurrency ?? 'FCFA',

    // 🔥 FIX ICI : ne pas forcer commerce
    tenantSector: payload.tenantSector ?? null,

    canManageProperties: !!payload.canManageProperties,
    canManageTenants: !!payload.canManageTenants,
    canManageContracts: !!payload.canManageContracts,
    canManageRents: !!payload.canManageRents,
    canManageOwnerPayments: !!payload.canManageOwnerPayments,
    canViewDashboard: !!payload.canViewDashboard,

    canAccessSale: !!payload.canAccessSale,
    canAccessRental: !!payload.canAccessRental,
    canAccessYango: !!payload.canAccessYango,
    canManageExpenses: !!payload.canManageExpenses,
    canManageAccounting: !!payload.canManageAccounting,
    canDoDataEntry: !!payload.canDoDataEntry,
    canManageVehicles: !!payload.canManageVehicles,
    canManageDrivers: !!payload.canManageDrivers,
    canManagePayments: !!payload.canManagePayments,
    canManageUsers: !!payload.canManageUsers,

    canManageProducts: !!payload.canManageProducts,
    canManageStock: !!payload.canManageStock,
  };
}
}
