import { Injectable } from "@nestjs/common";
import { UserMemory } from "@prisma/client";

@Injectable()
export class ContextBuilderService {
  buildMemoryPrompt(memories: UserMemory[]): string {
    if (!memories || memories.length === 0) {
      return "";
    }
    const lines = memories
      .filter((m) => m.is_active)
      .map((m) => `- ${m.memory_key}: ${m.memory_value}`);

    if (lines.length === 0) return "";

    return (
      "\n\n[Thông tin ghi nhớ về người dùng]:\n" +
      lines.join("\n") +
      "\nHãy sử dụng các thông tin trên một cách tự nhiên khi trò chuyện."
    );
  }
}
