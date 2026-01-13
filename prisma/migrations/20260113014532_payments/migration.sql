-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('COINPAYMENT');

-- CreateEnum
CREATE TYPE "PaymentItemType" AS ENUM ('PACKAGE_PURCHASE', 'PACKAGE_UPGRADE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('NOT_ELIGIBLE', 'ELIGIBLE', 'COMPLETED');

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'COINPAYMENT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "commission_status" "CommissionStatus" NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "provider_reference" TEXT,
    "expires_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "type" "PaymentItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceId" INTEGER,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments"("provider_reference");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
