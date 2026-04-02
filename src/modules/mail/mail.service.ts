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
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.MAIL_FROM;
    const fromName = process.env.MAIL_FROM_NAME || 'SunuSuite';
    const loginUrl = process.env.APP_LOGIN_URL || '#';

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
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: [
        {
          email: data.to,
          name: data.ownerName || undefined,
        },
      ],
      subject: 'SunuSuite - Vos accès et contrat',
      htmlContent: html,
      attachment: [
        {
          name: 'contrat.pdf',
          content: data.pdfBuffer.toString('base64'),
        },
      ],
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
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

    console.log('Email envoyé avec succès via Brevo API:', responseBody);

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
