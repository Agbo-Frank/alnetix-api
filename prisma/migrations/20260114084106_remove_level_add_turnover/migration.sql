/*
  Warnings:

  - You are about to drop the column `level` on the `users` table. All the data in the column will be lost.
  - Made the column `referral_code` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- Add amount column as nullable first
ALTER TABLE "commissions" ADD COLUMN "amount" DOUBLE PRECISION;

-- Update existing commissions with payment amount
UPDATE "commissions" c
SET "amount" = p.amount
FROM "payments" p
WHERE c."paymentId" = p.id AND c."amount" IS NULL;

-- Make amount NOT NULL now that all rows have values
ALTER TABLE "commissions" ALTER COLUMN "amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "level",
ADD COLUMN     "turnover" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "referral_code" SET NOT NULL;
