-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('affiliate', 'unstoppable');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commission_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "commission_earned" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "commissions" (
    "id" SERIAL NOT NULL,
    "type" "CommissionType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commissions_type_idx" ON "commissions"("type");

-- CreateIndex
CREATE INDEX "commissions_userId_idx" ON "commissions"("userId");

-- CreateIndex
CREATE INDEX "commissions_customerId_idx" ON "commissions"("customerId");

-- CreateIndex
CREATE INDEX "commissions_paymentId_idx" ON "commissions"("paymentId");

-- CreateIndex
CREATE INDEX "commissions_createdAt_idx" ON "commissions"("createdAt");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
