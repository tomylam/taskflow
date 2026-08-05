import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function main() {
  const distHash = await bcrypt.hash('password123', 10);
  const provHash = await bcrypt.hash('password123', 10);

  const dist = await prisma.user.upsert({
    where: { email: 'distributor@demo.com' },
    update: {},
    create: { name: 'Demo Distributor', email: 'distributor@demo.com', passwordHash: distHash, role: 'DISTRIBUTOR' },
  });

  const prov = await prisma.user.upsert({
    where: { email: 'provider@demo.com' },
    update: {},
    create: { name: 'Demo Provider', email: 'provider@demo.com', passwordHash: provHash, role: 'PROVIDER' },
  });

  console.log('✅ Seed complete');
  console.log(`   Distributor: ${dist.email} / password123`);
  console.log(`   Provider:    ${prov.email} / password123`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
