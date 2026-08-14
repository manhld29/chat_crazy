import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import configuration from "./config/configuration";
import { ConversationsModule } from "./conversations/conversations.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { MemoryModule } from "./memory/memory.module";
import { MessagesModule } from "./messages/messages.module";
import { ObservabilityModule } from "./observability/observability.module";
import { PersonalitiesModule } from "./personalities/personalities.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { UsageModule } from "./usage/usage.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    PersonalitiesModule,
    ConversationsModule,
    MessagesModule,
    ChatModule,
    MemoryModule,
    UsageModule,
    FeedbackModule,
    AdminModule,
    ObservabilityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
