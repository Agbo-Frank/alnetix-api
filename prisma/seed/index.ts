import 'dotenv/config';
import { PrismaClient } from 'src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import seedPools from './pools';
import seedPackages from './packages';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  return await Promise.all([
    seedPackages(prisma),
    seedPools(prisma),
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