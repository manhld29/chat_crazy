import { Injectable } from "@nestjs/common";

@Injectable()
export class SafetyService {
  checkInput(content: string): {
    decision: "ALLOW" | "BLOCK";
    safeResponse?: string;
  } {
    if (!content || !content.trim()) {
      return { decision: "ALLOW" };
    }
    // Safety rules can be expanded here
    return { decision: "ALLOW" };
  }
}
