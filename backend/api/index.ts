import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import express, { Express } from "express";
import { AppModule } from "../src/app.module";
import { GlobalHttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { RequestIdInterceptor } from "../src/common/interceptors/request-id.interceptor";

const expressApp: Express = express();
let isInitialized = false;

async function bootstrap() {
  if (!isInitialized) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    const configService = app.get(ConfigService);

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );
    app.useGlobalInterceptors(new RequestIdInterceptor());
    app.useGlobalFilters(new GlobalHttpExceptionFilter());

    const prefix = configService.get<string>("apiV1Prefix", "/api/v1");
    const normalizedPrefix = prefix.startsWith("/") ? prefix.slice(1) : prefix;
    app.setGlobalPrefix(normalizedPrefix);

    app.enableCors({
      origin: (origin, callback) => callback(null, true),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-ID",
        "X-Metrics-Token",
        "Accept",
      ],
    });

    await app.init();
    isInitialized = true;
  }
  return expressApp;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrap();
  server(req, res);
}
