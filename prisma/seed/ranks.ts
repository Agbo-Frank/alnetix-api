import { PrismaClient } from "src/generated/client";

export default async function seedRanks(prisma: PrismaClient) {
  console.log('Seeding ranks...');
  const ranks = [
    {
      name: 'Pool 1',
      slug: 'pool-1',
      min_direct_members: 3,
      min_indirect_members: 0,
      min_turnover: 3000,
      order: 1,
      cumulative_percent: 5.0,
      max_turnover_per_leg: 1000,
    },
    {
      name: 'Pool 2',
      slug: 'pool-2',
      min_direct_members: 4,
      min_indirect_members: 5,
      min_turnover: 6000,
      order: 2,
      cumulative_percent: 10.0,
      max_turnover_per_leg: 2500,
    },
    {
      name: 'Pool 3',
      slug: 'pool-3',
      min_direct_members: 4,
      min_indirect_members: 10,
      min_turnover: 12000,
      order: 3,
      cumulative_percent: 20.0,
      max_turnover_per_leg: 5000,
    },
    {
      name: 'Pool 4',
      slug: 'pool-4',
      min_direct_members: 5,
      min_indirect_members: 25,
      min_turnover: 25000,
      order: 4,
      cumulative_percent: 30.0,
      max_turnover_per_leg: 10000,
    },
    {
      name: 'Pool 5',
      slug: 'pool-5',
      min_direct_members: 5,
      min_indirect_members: 50,
      min_turnover: 50000,
      order: 5,
      cumulative_percent: 40.0,
      max_turnover_per_leg: 25000,
    },
    {
      name: 'Pool 6',
      slug: 'pool-6',
      min_direct_members: 5,
      min_indirect_members: 150,
      min_turnover: 1000000,
      order: 6,
      cumulative_percent: 50.0,
      max_turnover_per_leg: 50000,
    },
    {
      name: 'Pool 7',
      slug: 'pool-7',
      min_direct_members: 6,
      min_indirect_members: 150,
      min_turnover: 250000,
      order: 7,
      cumulative_percent: 50.0,
      max_turnover_per_leg: 50000,
    },
    {
      name: 'Pool 8',
      slug: 'pool-8',
      min_direct_members: 6,
      min_indirect_members: 150,
      min_turnover: 500000,
      order: 8,
      cumulative_percent: 50.0,
      max_turnover_per_leg: 50000,
    },
    {
      name: 'Pool 9',
      slug: 'pool-9',
      min_direct_members: 7,
      min_indirect_members: 150,
      min_turnover: 1000000,
      order: 9,
      cumulative_percent: 50.0,
      max_turnover_per_leg: 50000,
    },
    {
      name: 'Pool 10',
      slug: 'pool-10',
      min_direct_members: 7,
      min_indirect_members: 150,
      min_turnover: 2500000,
      order: 10,
      cumulative_percent: 50.0,
      max_turnover_per_leg: 50000,
    }
  ];

  for (const rank of ranks) {
    await prisma.rank.upsert({
      where: { slug: rank.slug },
      update: {},
      create: rank,
    });
    console.log(`✓ Seeded rank: ${rank.name} (${rank.slug}) - Order: ${rank.order}`);
  }
  console.log('Seed completed successfully!');
}