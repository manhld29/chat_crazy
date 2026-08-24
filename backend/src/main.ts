import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  const port = configService.get<number>("port", 8000);
  await app.listen(port, "0.0.0.0");
  console.log(
    `Backend server is running on port ${port} with prefix /${normalizedPrefix}`,
  );
}

bootstrap();
