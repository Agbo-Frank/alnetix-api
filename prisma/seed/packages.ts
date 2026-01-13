import { PrismaClient } from "@prisma/client";

export default async function seedPackages(prisma: PrismaClient) {
  console.log('Seeding packages...');
  const packages = [
    {
      slug: 'access-key',
      name: 'THE ACCESS KEY',
      description: 'Backoffice Access Only',
      price: 97.0,
    },
    {
      slug: 'knowledge-package',
      name: 'KNOWLEDGE PACKAGE',
      description: 'Unlock Atlas',
      price: 497.0,
    },
    {
      slug: 'transformation-package',
      name: 'TRANSFORMATION PACKAGE',
      description: 'Unlock Psyche',
      price: 1997.0,
    },
    {
      slug: 'the-key',
      name: 'THE KEY',
      description: 'Unlock Atlas & Psyche',
      price: 4997.0,
    },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: pkg,
    });
    console.log(`✓ Seeded package: ${pkg.name} (${pkg.slug})`);
  }
  console.log('Seed completed successfully!');
}