import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { User } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";

describe("AdminService", () => {
  let service: AdminService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
    usageEvent: {
      findMany: jest.fn(),
    },
  };

  const mockAuthService = {
    verifyPassword: jest.fn(),
    createTokens: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const configMap: Record<string, any> = {
        appEnv: "development",
        appName: "Funny Chatbot API",
        appVersion: "0.1.0",
        defaultLlmModel: "llama-3.3-70b-versatile",
        cheapLlmModel: "llama-3.1-8b-instant",
        fallbackLlmModel: "llama-3.1-8b-instant",
        groqApiKey: "test-key",
        metricsEnabled: true,
        contextTokenBudget: 4096,
        conversationWindowMessages: 20,
        rateLimitPerMinute: 60,
      };
      return configMap[key] !== undefined ? configMap[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe("getAdminConfig", () => {
    it("should throw ForbiddenException if user is not admin", () => {
      const regularUser = { id: "user-1", is_admin: false } as User;
      expect(() => service.getAdminConfig(regularUser)).toThrow(
        ForbiddenException,
      );
    });

    it("should return config object if user is admin", () => {
      const adminUser = { id: "admin-1", is_admin: true } as User;
      const result = service.getAdminConfig(adminUser);
      expect(result).toHaveProperty("app_env", "development");
      expect(result).toHaveProperty("app_name", "Funny Chatbot API");
      expect(result).toHaveProperty("groq_configured", true);
    });
  });
});
