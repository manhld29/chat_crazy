import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { LlmModule } from "../llm/llm.module";
import { MemoryModule } from "../memory/memory.module";
import { ObservabilityModule } from "../observability/observability.module";
import { UsageModule } from "../usage/usage.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { SafetyService } from "./safety.service";

@Module({
  imports: [
    ConversationsModule,
    LlmModule,
    MemoryModule,
    UsageModule,
    ObservabilityModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, SafetyService],
  exports: [ChatService],
})
export class ChatModule {}
