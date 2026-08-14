import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class PersonalitiesService {
  private readonly CACHE_KEY = "personalities:all";
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findAll() {
    const cached = await this.redisService.get<any[]>(this.CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    const personalities = await this.prisma.personality.findMany({
      orderBy: { created_at: "asc" },
    });

    const result = personalities.map((p) => ({
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

    await this.redisService.set(this.CACHE_KEY, result, this.CACHE_TTL);

    return result;
  }

  async findByCode(code: string) {
    return this.prisma.personality.findUnique({
      where: { code },
    });
  }
}
