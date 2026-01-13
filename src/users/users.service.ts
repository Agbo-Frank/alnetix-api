import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../utils/storage/s3.service';
import * as bcrypt from 'bcrypt';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UpdateWalletDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        rank: true,
        package: true,
      },
      omit: {
        password: true,
      },
    });

    return { message: 'User fetched successfully', data: user };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!existingUser || !existingUser.profile) {
      throw new NotFoundException('User profile not found');
    }

    const profileData: any = {};

    if (dto.first_name) {
      profileData.first_name = dto.first_name;
    }
    if (dto.last_name) {
      profileData.last_name = dto.last_name;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: profileData,
        },
      },
    });

    return { message: 'Profile updated successfully', data: user };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully', data: null };
  }

  /**
   * Update user profile image
   */
  async updateProfileImage(userId: number, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User profile not found');
    }

    const imageUrl = await this.s3Service.uploadFile(file, 'profiles');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            image: imageUrl,
          },
        },
      },
    });

    return { message: 'Profile image updated successfully', data: null };
  }

  /**
   * Update user wallet address
   */
  async updateWalletAddress(userId: number, dto: UpdateWalletDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        wallet_address: dto.wallet_address || null,
      },
    });

    return { message: 'Wallet address updated successfully', data: null };
  }
}
