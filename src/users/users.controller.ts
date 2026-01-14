import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  UseGuards,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../utils';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UpdateWalletDto,
} from './dto';
import type { User } from 'src/generated/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Patch('profile/image')
  @UseInterceptors(FileInterceptor('image'))
  async updateProfileImage(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/jpg|image\/png|image\/webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateProfileImage(user.id, file);
  }

  @Put('wallet')
  async updateWalletAddress(
    @CurrentUser() user: User,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.usersService.updateWalletAddress(user.id, dto);
  }

  @Get('members')
  async getMembers(
    @CurrentUser() user: User,
    @Query('referralCode') referralCode: string,
  ) {
    return this.usersService.getMembers(user.id, referralCode);
  }
}
