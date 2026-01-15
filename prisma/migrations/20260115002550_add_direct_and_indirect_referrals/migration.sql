-- AlterTable
ALTER TABLE "users" ADD COLUMN     "direct_referrals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "indirect_referrals" INTEGER NOT NULL DEFAULT 0;
