import { PrismaClient } from "@prisma/client";

export default async function seedRanks(prisma: PrismaClient) {
  console.log('Seeding ranks...');
  const ranks = [
    {
      name: 'Bronze',
      slug: 'bronze',
      min_direct_members: 0,
      min_indirect_members: 0,
      min_turnover: 0,
      order: 1,
      cumulative_percent: 5.0,
      max_turnover_per_leg: 1000,
    },
    {
      name: 'Silver',
      slug: 'silver',
      min_direct_members: 3,
      min_indirect_members: 5,
      min_turnover: 5000,
      order: 2,
      cumulative_percent: 10.0,
      max_turnover_per_leg: 2500,
    },
    {
      name: 'Gold',
      slug: 'gold',
      min_direct_members: 5,
      min_indirect_members: 10,
      min_turnover: 15000,
      order: 3,
      cumulative_percent: 20.0,
      max_turnover_per_leg: 5000,
    },
    {
      name: 'Platinum',
      slug: 'platinum',
      min_direct_members: 10,
      min_indirect_members: 25,
      min_turnover: 50000,
      order: 4,
      cumulative_percent: 30.0,
      max_turnover_per_leg: 10000,
    },
    {
      name: 'Diamond',
      slug: 'diamond',
      min_direct_members: 20,
      min_indirect_members: 50,
      min_turnover: 150000,
      order: 5,
      cumulative_percent: 40.0,
      max_turnover_per_leg: 25000,
    },
    {
      name: 'Crown',
      slug: 'crown',
      min_direct_members: 50,
      min_indirect_members: 150,
      min_turnover: 500000,
      order: 6,
      cumulative_percent: 50.0,
      max_turnover_per_leg: 50000,
    },
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