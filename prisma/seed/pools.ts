import { PrismaClient } from "src/generated/client";

export default async function seedPools(prisma: PrismaClient) {
  const pools = [
    {
      id: 1,
      name: 'Pool 1',
      min_direct_members: 0,
      min_turnover: 100,
      min_team_turnover: 200,
      max_turnover_per_leg: 100,
    },
    {
      id: 2,
      name: 'Pool 2',
      min_direct_members: 0,
      min_turnover: 500,
      min_team_turnover: 2000,
      max_turnover_per_leg: 1000,
    },
    {
      id: 3,
      name: 'Pool 3',
      min_direct_members: 0,
      min_turnover: 500,
      min_team_turnover: 5000,
      max_turnover_per_leg: 2500,
    },
    {
      id: 4,
      name: 'Pool 4',
      min_direct_members: 0,
      min_turnover: 2000,
      min_team_turnover: 25000,
      max_turnover_per_leg: 12500,
    },
    {
      id: 5,
      name: 'Pool 5',
      min_direct_members: 0,
      min_turnover: 5000,
      min_team_turnover: 50000,
      max_turnover_per_leg: 25000,
    },
    {
      id: 6,
      name: 'Pool 6',
      min_direct_members: 0,
      min_turnover: 5000,
      min_team_turnover: 1000000,
      max_turnover_per_leg: 500000,
    },
    {
      id: 7,
      name: 'Pool 7',
      min_direct_members: 6,
      min_turnover: 10000,
      min_team_turnover: 250000,
      max_turnover_per_leg: 125000,
    },
    {
      id: 8,
      name: 'Pool 8',
      min_direct_members: 6,
      min_turnover: 25000,
      min_team_turnover: 800000,
      max_turnover_per_leg: 400000,
    },
    {
      id: 9,
      name: 'Pool 9',
      min_direct_members: 7,
      min_turnover: 250000,
      min_team_turnover: 2500000,
      max_turnover_per_leg: 1250000,
    },
    {
      id: 10,
      name: 'Pool 10',
      min_direct_members: 7,
      min_turnover: 250000,
      min_team_turnover: 10000000,
      max_turnover_per_leg: 5000000,
    }
  ];

  for (const pool of pools) {
    const { id, ...rest } = pool;
    const createdPool = await prisma.pool.upsert({
      where: { id: pool.id },
      update: rest,
      create: rest,
    });
    console.log(`✓ Seeded pool: ${createdPool.name} (ID: ${createdPool.id})`);
  }
  console.log('Seed completed successfully!');
}