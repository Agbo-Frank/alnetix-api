import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : Number(process.env.SMTP_PORT) === 465; // true for 465, false for other ports

    console.log({ port: Number(process.env.SMTP_PORT), secure });
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      debug: true,
      logger: true,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      tls: {
        rejectUnauthorized: false,
      },
      ...(secure ? { requireTLS: true } : {}),
    });
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, unknown>,
  ): string {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.hbs`,
    );
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    return template({
      ...context,
      year: new Date().getFullYear(),
    });
  }

  async sendVerificationEmail(email: string, firstName: string, token: string) {
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const html = this.renderTemplate('verification', {
      firstName,
      url,
    });

    await this.sendMail({
      email,
      subject: 'Verify your email address - Alnetix',
      html,
    });
  }

  private async sendMail({
    email,
    subject,
    html,
  }: {
    email: string;
    subject: string;
    html: string;
  }) {
    try {
      console.log({ html });
      await this.transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('SMTP email error:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ) {
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = this.renderTemplate('password-reset', {
      firstName,
      url,
    });

    await this.sendMail({
      email,
      subject: 'Password Reset Request - Alnetix',
      html,
    });
  }
}
