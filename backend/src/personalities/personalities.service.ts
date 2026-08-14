import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PersonalitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const personalities = await this.prisma.personality.findMany({
      orderBy: { created_at: "asc" },
    });
    return personalities.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      default_temperature: p.default_temperature,
      default_max_output_tokens: p.default_max_output_tokens,
      is_system: p.is_system,
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
    }));
  }

  async findByCode(code: string) {
    return this.prisma.personality.findUnique({
      where: { code },
    });
  }
}
