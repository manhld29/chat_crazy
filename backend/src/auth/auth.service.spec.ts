import { BadRequestException, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const configMap: Record<string, any> = {
        accessTokenExpireMinutes: 30,
        refreshTokenExpireDays: 30,
        jwtSecretKey: "test-secret-key",
      };
      return configMap[key] !== undefined ? configMap[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe("hashPassword & verifyPassword", () => {
    it("should hash password and verify successfully", async () => {
      const password = "mySecretPassword123";
      const hash = await service.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);

      const isValid = await service.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isWrongValid = await service.verifyPassword("wrongPassword", hash);
      expect(isWrongValid).toBe(false);
    });

    it("should throw BadRequestException for password exceeding 256 chars", async () => {
      const longPassword = "a".repeat(257);
      await expect(service.hashPassword(longPassword)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("register", () => {
    it("should throw ConflictException if email is already registered", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: "u1",
        email: "test@example.com",
      });
      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          display_name: "Test",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should create new user and return tokens when registration succeeds", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      const mockCreatedUser: User = {
        id: "u-123",
        email: "new@example.com",
        username: null,
        password_hash: "hashed",
        display_name: "New User",
        is_guest: false,
        is_active: true,
        is_admin: false,
        daily_message_limit: null,
        created_at: new Date(),
        updated_at: new Date(),
        last_login_at: null,
      };
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
      mockPrismaService.refreshSession.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.register({
        email: "new@example.com",
        password: "password123",
        display_name: "New User",
      });

      expect(result).toHaveProperty("access_token", "mock-jwt-token");
      expect(result).toHaveProperty("refresh_token");
      expect(result.user).toHaveProperty("email", "new@example.com");
    });
  });
});
