import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
// import seedRanks from './ranks';
import seedPackages from './packages';

const prisma = new PrismaClient();

async function main() {
  return await Promise.all([
    seedPackages(prisma),
    // seedRanks(prisma),
  ]);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });