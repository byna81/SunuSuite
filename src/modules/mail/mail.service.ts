import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';

  async sendManagerAccessEmail(data: {
  to: string;
  ownerName: string;
  login: string;
  password: string;
  pdfBuffer: Buffer;
}) {
  const loginUrl = process.env.APP_LOGIN_URL || '#';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sunusuite.com';

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #111827;">
        <h2>Bienvenue sur SunuSuite</h2>
        <p>Bonjour ${this.escapeHtml(data.ownerName)},</p>
        <p>Votre activité a été validée avec succès.</p>

        <p><strong>Identifiant :</strong> ${this.escapeHtml(data.login)}</p>
        <p><strong>Mot de passe :</strong> ${this.escapeHtml(data.password)}</p>

        <p>
          <a href="${this.escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer">
            Se connecter
          </a>
        </p>

        <p>Merci de modifier votre mot de passe après connexion.</p>
      </body>
    </html>
  `;

  const payload = {
    subject: 'SunuSuite - Vos accès et contrat',
    to: [
      {
        email: data.to,
        name: data.ownerName || undefined,
      },
    ],
    bcc: [
      {
        email: adminEmail,
        name: 'Admin SunuSuite',
      },
    ],
    htmlContent: html,
    attachment: [
      {
        name: 'contrat.pdf',
        content: data.pdfBuffer.toString('base64'),
      },
    ],
  };

  const responseBody = await this.sendViaBrevo(payload);

  console.log('Email envoyé avec succès via Brevo API:', responseBody);

  return responseBody;
}
  async sendPasswordResetEmail(data: {
    to: string;
    ownerName: string;
    code: string;
  }) {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #111827;">
          <h2>Réinitialisation de mot de passe SunuSuite</h2>
          <p>Bonjour ${this.escapeHtml(data.ownerName)},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>
            <strong>Code de réinitialisation :</strong>
            ${this.escapeHtml(data.code)}
          </p>
          <p>Ce code est valable pendant 10 minutes.</p>
          <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.</p>
        </body>
      </html>
    `;

    const payload = {
      subject: 'SunuSuite - Réinitialisation de mot de passe',
      to: [
        {
          email: data.to,
          name: data.ownerName || undefined,
        },
      ],
      htmlContent: html,
    };

    const responseBody = await this.sendViaBrevo(payload);

    console.log(
      'Email reset password envoyé avec succès via Brevo API:',
      responseBody,
    );

    return responseBody;
  }

  private async sendViaBrevo(payload: {
    subject: string;
    to: Array<{ email: string; name?: string }>;
    htmlContent: string;
    attachment?: Array<{ name: string; content: string }>;
  }) {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.MAIL_FROM;
    const fromName = process.env.MAIL_FROM_NAME || 'SunuSuite';

    if (!apiKey) {
      throw new InternalServerErrorException(
        'BREVO_API_KEY est manquante dans les variables d’environnement',
      );
    }

    if (!fromEmail) {
      throw new InternalServerErrorException(
        'MAIL_FROM est manquante dans les variables d’environnement',
      );
    }

    const body = {
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: payload.to,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      ...(payload.attachment ? { attachment: payload.attachment } : {}),
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    let responseBody: any = null;

    try {
      responseBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      responseBody = rawText;
    }

    if (!response.ok) {
      console.error('Brevo API error:', {
        status: response.status,
        body: responseBody,
      });

      throw new InternalServerErrorException(
        typeof responseBody?.message === 'string'
          ? responseBody.message
          : 'Erreur lors de l’envoi du mail via Brevo API',
      );
    }

    return responseBody;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
