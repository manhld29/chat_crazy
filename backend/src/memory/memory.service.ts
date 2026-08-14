import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMemoryDto } from "./dto/create-memory.dto";

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  formatMemory(m: any) {
    return {
      id: m.id,
      memory_key: m.memory_key,
      memory_value: m.memory_value,
      category: m.category,
      confidence: m.confidence,
      source_message_id: m.source_message_id,
      is_active: m.is_active,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString(),
    };
  }

  async findUserMemories(user: User) {
    const items = await this.prisma.userMemory.findMany({
      where: { user_id: user.id, is_active: true },
      orderBy: { created_at: "desc" },
    });
    return {
      items: items.map((m) => this.formatMemory(m)),
    };
  }

  async create(user: User, dto: CreateMemoryDto) {
    const memory = await this.prisma.userMemory.create({
      data: {
        user_id: user.id,
        memory_key: dto.memory_key,
        memory_value: dto.memory_value,
        category: dto.category,
      },
    });
    return this.formatMemory(memory);
  }

  async deleteOne(user: User, id: string) {
    const item = await this.prisma.userMemory.findUnique({
      where: { id },
    });
    if (!item || item.user_id !== user.id) {
      throw new NotFoundException("Memory not found");
    }
    await this.prisma.userMemory.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async deleteAll(user: User) {
    await this.prisma.userMemory.updateMany({
      where: { user_id: user.id },
      data: { is_active: false },
    });
  }
}
