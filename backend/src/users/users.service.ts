import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  getMe(user: User) {
    return this.authService.formatUserPublic(user);
  }

  async updateMe(user: User, dto: UpdateMeDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { display_name: dto.display_name },
    });
    return this.authService.formatUserPublic(updated);
  }
}
