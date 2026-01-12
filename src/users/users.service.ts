import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        rank: true,
        package: true,
      },
    });

    // @ts-expect-error delete password from user object
    delete user?.password;
    return user;
  }
}
