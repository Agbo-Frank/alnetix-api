import { PrismaClient } from "src/generated/client";
import * as bcrypt from 'bcrypt';
import dayjs from 'dayjs';

// Normalize email by converting to lowercase and trimming
const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export default async function seedUsers(prisma: PrismaClient) {
  const rootUserEmail = process.env.ROOT_USER_EMAIL;
  const rootUserPassword = process.env.ROOT_USER_PASSWORD;
  const rootUserFirstName = 'Root';
  const rootUserLastName = 'User';
  const rootUserDateOfBirth = '1990-01-01';

  if (!rootUserEmail || !rootUserPassword) {
    console.log('⚠ Skipping root user seed: ROOT_USER_EMAIL and ROOT_USER_PASSWORD must be set in environment variables');
    return;
  }

  const normalizedEmail = normalizeEmail(rootUserEmail);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(rootUserPassword, 10);

  const dobDate = dayjs(rootUserDateOfBirth);
  const datePart = dobDate.format('YYYYMMDD');
  const referralCode = `RU-${datePart}-1`;

  const streamlineCount = await prisma.user.count();
  const streamline = streamlineCount + 1;

  const data = {
    email: normalizedEmail,
    password: hashedPassword,
    referral_code: referralCode,
    referred_by_code: null, // Root user is not referred by anyone
    is_verified: true, // Root user is pre-verified
    streamline,
    profile: {
      create: {
        gender: "male",
        country: "us",
        email: normalizedEmail,
        first_name: rootUserFirstName,
        last_name: rootUserLastName,
        date_of_birth: dayjs(rootUserDateOfBirth).toDate(),
      },
    },
  }

  // Create root user
  const rootUser = await prisma.user.upsert({
    where: { email: data.email },
    update: data,
    create: data,
    include: { profile: true },
  });

  console.log(`✓ Seeded root user: ${rootUser.email} (ID: ${rootUser.id},Referral Code: ${rootUser.referral_code})`);
}