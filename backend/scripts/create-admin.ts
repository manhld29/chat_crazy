import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createOrUpdateAdminUser, getAdminInputFromEnv } from '../src/admin/create-admin-helper';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value) {
        params[key] = value;
      }
    }
  }
  return params;
}

async function main() {
  const args = parseArgs();
  const input = getAdminInputFromEnv(process.env, args);

  console.log('--------------------------------------------------');
  console.log('Creating / Updating Administrator User...');
  console.log(`Email:        ${input.email}`);
  console.log(`Username:     ${input.username}`);
  console.log(`Display Name: ${input.displayName || 'System Administrator'}`);
  console.log('--------------------------------------------------');

  const adminUser = await createOrUpdateAdminUser(prisma, input);

  console.log('✅ Administrator account ready successfully!');
  console.log(`User ID:  ${adminUser.id}`);
  console.log(`Is Admin: ${adminUser.is_admin}`);
  console.log(`Active:   ${adminUser.is_active}`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Failed to create Administrator account:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
