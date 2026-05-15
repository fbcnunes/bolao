import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@bolao2026.com';
  const adminPassword = 'Arosio2001';

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
      },
      create: {
        name: 'Administrador',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ATIVO',
      },
    });
    console.log(`✅ Admin user upserted: ${adminEmail} / ${adminPassword}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
