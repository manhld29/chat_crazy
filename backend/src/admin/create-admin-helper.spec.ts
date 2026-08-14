import { validateAdminInput, createOrUpdateAdminUser, getAdminInputFromEnv, AdminInput } from './create-admin-helper';
import * as argon2 from 'argon2';

describe('Create Admin Helper (Unit Tests with Mock Data)', () => {
  describe('getAdminInputFromEnv', () => {
    it('should throw error when env variables are missing', () => {
      const mockEnv = {};
      expect(() => getAdminInputFromEnv(mockEnv, {})).toThrow(
        'Missing required environment variables or CLI arguments for admin account creation: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD',
      );
    });

    it('should successfully read credentials from env variables', () => {
      const mockEnv = {
        ADMIN_EMAIL: 'mock-env-admin@test.example',
        ADMIN_USERNAME: 'mock_env_admin',
        ADMIN_PASSWORD: 'MockEnvPassword123!',
        ADMIN_DISPLAY_NAME: 'Mock Env Administrator',
      };
      const result = getAdminInputFromEnv(mockEnv, {});
      expect(result).toEqual({
        email: 'mock-env-admin@test.example',
        username: 'mock_env_admin',
        password: 'MockEnvPassword123!',
        displayName: 'Mock Env Administrator',
      });
    });

    it('should prioritize CLI args over env variables', () => {
      const mockEnv = {
        ADMIN_EMAIL: 'mock-env-admin@test.example',
        ADMIN_USERNAME: 'mock_env_admin',
        ADMIN_PASSWORD: 'MockEnvPassword123!',
      };
      const args = {
        email: 'mock-cli-admin@test.example',
        username: 'mock_cli_admin',
        password: 'MockCliPassword123!',
      };
      const result = getAdminInputFromEnv(mockEnv, args);
      expect(result.email).toBe('mock-cli-admin@test.example');
      expect(result.username).toBe('mock_cli_admin');
      expect(result.password).toBe('MockCliPassword123!');
    });
  });

  describe('validateAdminInput', () => {
    it('should throw error for invalid email', () => {
      const input: AdminInput = {
        email: 'invalid-email-format',
        username: 'mock_admin',
        password: 'MockPassword123!',
      };
      expect(() => validateAdminInput(input)).toThrow('Invalid email format');
    });

    it('should throw error for short password', () => {
      const input: AdminInput = {
        email: 'mock-admin@test.example',
        username: 'mock_admin',
        password: 'short',
      };
      expect(() => validateAdminInput(input)).toThrow('Password must be at least 8 characters long');
    });

    it('should throw error for invalid username', () => {
      const input: AdminInput = {
        email: 'mock-admin@test.example',
        username: 'a',
        password: 'MockPassword123!',
      };
      expect(() => validateAdminInput(input)).toThrow('Username must be at least 3 characters');
    });

    it('should pass for valid input', () => {
      const input: AdminInput = {
        email: 'mock-admin@test.example',
        username: 'mock_admin',
        password: 'MockPassword123!',
      };
      expect(() => validateAdminInput(input)).not.toThrow();
    });
  });

  describe('createOrUpdateAdminUser', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        user: {
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      };
    });

    it('should create a new admin user if not exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'mock-uuid-1', ...data }));

      const result = await createOrUpdateAdminUser(mockPrisma, {
        email: 'mock-new-admin@test.example',
        username: 'mock_new_admin',
        password: 'MockSecurePassword123!',
        displayName: 'Mock System Administrator',
      });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'mock-new-admin@test.example' }, { username: 'mock_new_admin' }],
        },
      });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      const createArg = mockPrisma.user.create.mock.calls[0][0].data;
      expect(createArg.email).toBe('mock-new-admin@test.example');
      expect(createArg.username).toBe('mock_new_admin');
      expect(createArg.is_admin).toBe(true);
      expect(createArg.is_guest).toBe(false);
      expect(await argon2.verify(createArg.password_hash, 'MockSecurePassword123!')).toBe(true);

      expect(result.email).toBe('mock-new-admin@test.example');
      expect(result.is_admin).toBe(true);
    });

    it('should promote and update existing user to admin', async () => {
      const existingUser = {
        id: 'mock-existing-id',
        email: 'mock-existing-user@test.example',
        username: 'mock_existing_user',
        is_admin: false,
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockImplementation(({ data }: any) => Promise.resolve({ ...existingUser, ...data }));

      const result = await createOrUpdateAdminUser(mockPrisma, {
        email: 'mock-existing-user@test.example',
        username: 'mock_existing_user',
        password: 'MockNewPassword123!',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'mock-existing-id' },
        data: expect.objectContaining({
          is_admin: true,
          is_active: true,
        }),
      });

      expect(result.is_admin).toBe(true);
    });
  });
});
