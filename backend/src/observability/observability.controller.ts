import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService } from "./metrics.service";

@Controller()
export class ObservabilityController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get("health")
  getHealth() {
    return {
      status: "ok",
      app_name: this.configService.get("appName", "Funny Chatbot API"),
      version: this.configService.get("appVersion", "0.1.0"),
      environment: this.configService.get("appEnv", "development"),
    };
  }

  @Get("ready")
  async getReady() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ready" };
    } catch {
      return { status: "not_ready" };
    }
  }

  @Get("metrics")
  getMetrics(@Headers("x-metrics-token") token?: string) {
    const enabled = this.configService.get<boolean>("metricsEnabled", true);
    if (!enabled) {
      throw new NotFoundException("Not found");
    }
    const configuredToken = this.configService.get<string>("metricsToken");
    if (configuredToken && token !== configuredToken) {
      throw new ForbiddenException("Forbidden");
    }
    return this.metricsService.getSnapshot();
  }
}
