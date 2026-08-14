import { Module } from "@nestjs/common";
import { ContextBuilderService } from "./context-builder.service";
import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";

@Module({
  controllers: [MemoryController],
  providers: [MemoryService, ContextBuilderService],
  exports: [MemoryService, ContextBuilderService],
})
export class MemoryModule {}
