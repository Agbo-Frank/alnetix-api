import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../env';
import dayjs from 'dayjs';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly logger: PinoLogger,
    private readonly env: AppConfigService,
  ) {
    this.logger.setContext(MailService.name);

    this.transporter = nodemailer.createTransport({
      host: this.env.smtpHost,
      port: this.env.smtpPort,
      secure: this.env.smtpPort === 465,
      auth: {
        user: this.env.smtpUser,
        pass: this.env.smtpPassword,
      },
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
      year: dayjs().year(),
    });
  }

  async sendVerificationEmail(email: string, firstName: string, token: string) {
    const url = `${this.env.frontendUrl}/verify-email/${token}`;
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
      await this.transporter.sendMail({
        from: `"${this.env.mailFromName}" <${this.env.mailFromAddress}>`,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error({ err: error, email, subject }, 'SMTP email error');
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ) {
    const url = `${this.env.frontendUrl}/reset-password?token=${token}`;
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
