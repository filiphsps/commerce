/*
  Warnings:

  - You are about to drop the column `alternateDomains` on the `Shop` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[alternativeDomains]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ShopCollaborator" DROP CONSTRAINT "ShopCollaborator_shopId_fkey";

-- DropForeignKey
ALTER TABLE "ShopCollaborator" DROP CONSTRAINT "ShopCollaborator_userId_fkey";

-- DropIndex
DROP INDEX "Shop_alternateDomains_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "oauth_token" TEXT,
ADD COLUMN     "oauth_token_secret" TEXT,
ADD COLUMN     "refresh_token_expires_in" INTEGER;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "alternateDomains",
ADD COLUMN     "alternativeDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_alternativeDomains_key" ON "Shop"("alternativeDomains");

-- AddForeignKey
ALTER TABLE "ShopCollaborator" ADD CONSTRAINT "ShopCollaborator_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCollaborator" ADD CONSTRAINT "ShopCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
