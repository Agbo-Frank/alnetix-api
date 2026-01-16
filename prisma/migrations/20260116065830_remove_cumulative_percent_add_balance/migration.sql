/*
  Warnings:

  - You are about to drop the column `cumulative_percent` on the `pools` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pools" DROP COLUMN "cumulative_percent",
ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
