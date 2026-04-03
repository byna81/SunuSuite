async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const rawCurrentPassword = currentPassword?.trim();
  const rawNewPassword = newPassword?.trim();

  if (!userId) {
    throw new BadRequestException('Utilisateur introuvable');
  }

  if (!rawCurrentPassword || !rawNewPassword) {
    throw new BadRequestException('Champs obligatoires manquants');
  }

  if (rawNewPassword.length < 6) {
    throw new BadRequestException(
      'Le nouveau mot de passe doit contenir au moins 6 caractères',
    );
  }

  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });

  if (!user) {
    throw new BadRequestException('Utilisateur introuvable');
  }

  const isPasswordValid = await bcrypt.compare(
    rawCurrentPassword,
    user.password,
  );

  if (!isPasswordValid) {
    throw new BadRequestException('Mot de passe actuel invalide');
  }

  const hashedPassword = await bcrypt.hash(rawNewPassword, 10);

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      resetCode: null,
      resetCodeExpiresAt: null,
    },
  });

  const refreshedUser = await this.prisma.user.findUnique({
    where: { id: user.id },
    include: { tenant: true },
  });

  return {
    message: 'Mot de passe modifié avec succès',
    user: this.buildUserResponse(refreshedUser),
  };
}
