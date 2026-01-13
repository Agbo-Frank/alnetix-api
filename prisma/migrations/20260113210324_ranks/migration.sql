/*
  Warnings:

  - The primary key for the `ranks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `slug` on the `ranks` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_rankId_fkey";

-- DropIndex
DROP INDEX "ranks_slug_key";

-- AlterTable
ALTER TABLE "ranks" DROP CONSTRAINT "ranks_pkey",
DROP COLUMN "slug",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ranks_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ranks_id_seq";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "rankId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
