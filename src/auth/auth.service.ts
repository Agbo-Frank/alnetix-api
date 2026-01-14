import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import { MailService } from '../utils/mail/mail.service';
import {
  ResetPasswordDto,
  LoginDto,
  RegisterDto,
} from './dto';
import { TokenType } from 'src/generated/client';
import { normalizeEmail } from '../utils/helpers';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const referrer = await this.prisma.user.findFirst({
      where: { referral_code: dto.referralCode },
    });

    if (!referrer) {
      throw new ConflictException('Referrer code is invalid');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const referralCode = await this.generateReferralCode(
      dto.firstName,
      dto.lastName,
      dto.dateOfBirth,
    );

    const streamlineCount = await this.prisma.user.count();
    const streamline = streamlineCount + 1;

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        referral_code: referralCode,
        referred_by_code: dto.referralCode,
        streamline,
        profile: {
          create: {
            first_name: dto.firstName,
            last_name: dto.lastName,
            date_of_birth: dayjs(dto.dateOfBirth).toDate(),
            gender: dto.gender,
            country: dto.country,
          },
        },
      },
      include: { profile: true },
    });

    const token = await this.createToken(user.id, TokenType.VERIFICATION, 30); // 30 mins

    await this.mailService.sendVerificationEmail(
      user.email,
      user.profile?.first_name || 'User',
      token,
    );

    return {
      message:
        'Registration successful. Please check your email for verification link.',
    };
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException(
        'Please verify your email address to log in',
      );
    }

    if (user.is_disabled) {
      throw new UnauthorizedException(
        'Your account has been disabled. Please contact support.',
      );
    }

    const payload = { sub: user.id, email: user.email };
    return {
      message: 'Login successful',
      data: {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.profile?.first_name,
          lastName: user.profile?.last_name,
        },
      }
    };
  }

  async verifyEmail(token: string) {
    const tokenRecord = await this.prisma.token.findUnique({
      where: { token, type: TokenType.VERIFICATION },
    });

    if (!tokenRecord || dayjs(tokenRecord.expires_at).isBefore(dayjs())) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { is_verified: true },
    });

    await this.prisma.token.delete({ where: { id: tokenRecord.id } });

    return { message: 'Email verified successfully. You can now log in.', data: null };
  }

  async resendVerification(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.is_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Delete existing verification tokens
    await this.prisma.token.deleteMany({
      where: { userId: user.id, type: TokenType.VERIFICATION },
    });

    const token = await this.createToken(user.id, TokenType.VERIFICATION, 30);
    await this.mailService.sendVerificationEmail(
      user.email,
      user.profile?.first_name || 'User',
      token,
    );

    return { message: 'Verification email resent.', data: null };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user) {
      // For security reasons, don't reveal if user exists
      return {
        message:
          'If an account exists with this email, a reset link has been sent.',
        data: null,
      };
    }

    // Delete existing reset tokens
    await this.prisma.token.deleteMany({
      where: { userId: user.id, type: TokenType.PASSWORD_RESET },
    });

    const token = await this.createToken(user.id, TokenType.PASSWORD_RESET, 15); // 15 mins
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.profile?.first_name || 'User',
      token,
    );

    return {
      message:
        'If an account exists with this email, a reset link has been sent.',
      data: null,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenRecord = await this.prisma.token.findUnique({
      where: { token: dto.token, type: TokenType.PASSWORD_RESET },
    });

    if (!tokenRecord || dayjs(tokenRecord.expires_at).isBefore(dayjs())) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { password: hashedPassword },
    });

    await this.prisma.token.delete({ where: { id: tokenRecord.id } });

    return {
      message:
        'Password reset successful. You can now log in with your new password.',
      data: null,
    };
  }

  private async generateReferralCode(
    firstName: string,
    lastName: string,
    dateOfBirth: string,
  ): Promise<string> {
    const firstInitial = firstName.trim().charAt(0).toUpperCase();
    const lastInitial = lastName.trim().charAt(0).toUpperCase();

    const dobDate = dayjs(dateOfBirth);
    const datePart = dobDate.format('YYYYMMDD');

    const prefix = `${firstInitial}${lastInitial}-${datePart}`;

    const count = await this.prisma.user.count({
      where: {
        referral_code: {
          startsWith: prefix,
        },
      }
    });

    return `${prefix}-${count + 1}`;
  }

  private async createToken(
    userId: number,
    type: TokenType,
    expiresMin: number,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = dayjs().add(expiresMin, 'minute').toDate();

    await this.prisma.token.create({
      data: {
        token,
        type,
        expires_at,
        userId,
      },
    });

    return token;
  }
}
