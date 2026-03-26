private buildUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email,
    login: user.login,
    fullName: user.fullName ?? null,
    phone: user.phone ?? null,
    role: user.role,
    isActive: user.isActive,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name ?? null,
    tenantSlug: user.tenant?.slug ?? null,
    tenantLogoUrl: user.tenant?.logoUrl ?? null,
    tenantAddress: user.tenant?.address ?? null,
    tenantPhone: user.tenant?.phone ?? null,
    tenantEmail: user.tenant?.email ?? null,
    tenantCurrency: user.tenant?.currency ?? 'FCFA',
    tenantSector: user.tenant?.sector ?? 'commerce',

    canManageProperties: !!user.canManageProperties,
    canManageTenants: !!user.canManageTenants,
    canManageContracts: !!user.canManageContracts,
    canManageRents: !!user.canManageRents,
    canManageOwnerPayments: !!user.canManageOwnerPayments,
    canViewDashboard: !!user.canViewDashboard,
  };
}

private async buildAuthResponse(user: any) {
  const payload = {
    sub: user.id,
    email: user.email,
    login: user.login,
    fullName: user.fullName ?? null,
    phone: user.phone ?? null,
    role: user.role,
    isActive: user.isActive,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name ?? null,
    tenantSlug: user.tenant?.slug ?? null,
    tenantLogoUrl: user.tenant?.logoUrl ?? null,
    tenantAddress: user.tenant?.address ?? null,
    tenantPhone: user.tenant?.phone ?? null,
    tenantEmail: user.tenant?.email ?? null,
    tenantCurrency: user.tenant?.currency ?? 'FCFA',
    tenantSector: user.tenant?.sector ?? 'commerce',

    canManageProperties: !!user.canManageProperties,
    canManageTenants: !!user.canManageTenants,
    canManageContracts: !!user.canManageContracts,
    canManageRents: !!user.canManageRents,
    canManageOwnerPayments: !!user.canManageOwnerPayments,
    canViewDashboard: !!user.canViewDashboard,
  };

  const accessToken = await this.jwtService.signAsync(payload);

  return {
    accessToken,
    user: this.buildUserResponse(user),
  };
}
