-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "referral_code" TEXT,
    "referred_by_code" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "level" CHAR(1),
    "team_turnover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "point" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "membership_due_date" TIMESTAMP(3),
    "rankId" INTEGER,
    "packageId" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "min_direct_members" INTEGER NOT NULL,
    "min_indirect_members" INTEGER NOT NULL,
    "min_turnover" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "cumulative_percent" DOUBLE PRECISION NOT NULL,
    "max_turnover_per_leg" INTEGER NOT NULL,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_key" ON "tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ranks_slug_key" ON "ranks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "packages_slug_key" ON "packages"("slug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
