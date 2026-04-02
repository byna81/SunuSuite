import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });
  }

  async sendManagerAccessEmail(data: {
    to: string;
    ownerName: string;
    login: string;
    password: string;
    pdfBuffer: Buffer;
  }) {
    const html = `
      <h2>Bienvenue sur SunuSuite</h2>
      <p>Bonjour ${data.ownerName},</p>
      <p>Votre activité a été validée avec succès.</p>
      <p><b>Identifiant :</b> ${data.login}</p>
      <p><b>Mot de passe :</b> ${data.password}</p>
      <p><a href="${process.env.APP_LOGIN_URL || '#'}">Se connecter</a></p>
      <p>Merci de modifier votre mot de passe après connexion.</p>
    `;

    const result = await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: data.to,
      subject: 'SunuSuite - Vos accès et contrat',
      html,
      attachments: [
        {
          filename: 'contrat.pdf',
          content: data.pdfBuffer,
        },
      ],
    });

    console.log('Email envoyé avec succès :', result.messageId);
    return result;
  }
}
