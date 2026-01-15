-- AlterTable
ALTER TABLE "users" RENAME COLUMN "direct_referrals" TO "direct_count";
ALTER TABLE "users" RENAME COLUMN "indirect_referrals" TO "indirect_count";