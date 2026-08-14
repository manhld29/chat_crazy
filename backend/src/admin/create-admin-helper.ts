import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

export interface AdminInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export function getAdminInputFromEnv(
  env: Record<string, string | undefined> = process.env,
  args: Record<string, string> = {},
): AdminInput {
  const email = args.email || env.ADMIN_EMAIL;
  const username = args.username || env.ADMIN_USERNAME;
  const password = args.password || env.ADMIN_PASSWORD;
  const displayName = args.displayName || env.ADMIN_DISPLAY_NAME || 'System Administrator';

  const missing: string[] = [];
  if (!email) missing.push('ADMIN_EMAIL');
  if (!username) missing.push('ADMIN_USERNAME');
  if (!password) missing.push('ADMIN_PASSWORD');

  if (missing.length > 0 || !email || !username || !password) {
    throw new Error(
      `Missing required environment variables or CLI arguments for admin account creation: ${missing.join(', ')}. Please define them in .env or pass as arguments.`,
    );
  }

  return {
    email,
    username,
    password,
    displayName,
  };
}

export function validateAdminInput(input: AdminInput): void {
  if (!input.email || !input.email.includes('@') || !input.email.includes('.')) {
    throw new Error('Invalid email format');
  }

  if (!input.username || input.username.trim().length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (input.password.length > 256) {
    throw new Error('Password must not exceed 256 characters');
  }
}

export async function createOrUpdateAdminUser(
  prisma: any,
  input: AdminInput,
) {
  validateAdminInput(input);

  const passwordHash = await argon2.hash(input.password);
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
  });

  if (existingUser) {
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        password_hash: passwordHash,
        display_name: input.displayName || existingUser.display_name || 'System Administrator',
        is_admin: true,
        is_active: true,
        is_guest: false,
      },
    });
    return updatedUser;
  }

  const newUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername,
      password_hash: passwordHash,
      display_name: input.displayName || 'System Administrator',
      is_admin: true,
      is_active: true,
      is_guest: false,
    },
  });

  return newUser;
}
