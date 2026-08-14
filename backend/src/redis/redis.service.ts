import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "@upstash/redis";

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("upstashRedisRestUrl");
    const token = this.configService.get<string>("upstashRedisRestToken");

    if (url && token) {
      try {
        this.client = new Redis({ url, token });
        this.logger.log("Upstash Redis REST client initialized successfully.");
      } catch (err) {
        this.logger.error("Failed to initialize Upstash Redis REST client", err);
      }
    } else {
      this.logger.warn(
        "Upstash Redis REST credentials (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) are missing. Redis features disabled.",
      );
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      return await this.client.get<T>(key);
    } catch (err) {
      this.logger.error(`Redis GET error for key ${key}`, err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, { ex: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (err) {
      this.logger.error(`Redis SET error for key ${key}`, err);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      this.logger.error(`Redis DEL error for key ${key}`, err);
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.incr(key);
    } catch (err) {
      this.logger.error(`Redis INCR error for key ${key}`, err);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (err) {
      this.logger.error(`Redis EXPIRE error for key ${key}`, err);
      return false;
    }
  }
}
