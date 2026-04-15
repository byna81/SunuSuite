  async suspendExpiredTenantsAfterGracePeriod(graceDays = 7) {
    const now = new Date();

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'past_due',
        endDate: {
          not: null,
        },
      },
      include: {
        tenant: true,
      },
    });

    let suspendedCount = 0;

    for (const subscription of subscriptions) {
      if (!subscription.endDate) continue;

      const graceLimit = new Date(subscription.endDate);
      graceLimit.setDate(graceLimit.getDate() + graceDays);

      if (now > graceLimit) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'suspended',
            suspendedAt: now,
          },
        });

        await this.prisma.tenant.update({
          where: { id: subscription.tenantId },
          data: {
            isActive: false,
          },
        });

        await this.prisma.user.updateMany({
          where: { tenantId: subscription.tenantId },
          data: {
            isActive: false,
          },
        });

        await this.prisma.tenantModule.updateMany({
          where: { tenantId: subscription.tenantId },
          data: {
            isEnabled: false,
            expiresAt: now,
          },
        });

        suspendedCount += 1;
      }
    }

    return {
      message: `${suspendedCount} client(s) suspendu(s) après délai de grâce`,
    };
  }
}
