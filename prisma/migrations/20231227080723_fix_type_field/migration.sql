/*
  Warnings:

  - You are about to drop the column `name` on the `CommerceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ContentProvider` table. All the data in the column will be lost.
  - Added the required column `type` to the `CommerceProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `ContentProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommerceProvider" DROP COLUMN "name",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ContentProvider" DROP COLUMN "name",
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CheckoutProvider" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "CheckoutProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckoutProvider_shopId_idx" ON "CheckoutProvider"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutProvider_shopId_key" ON "CheckoutProvider"("shopId");

-- AddForeignKey
ALTER TABLE "CheckoutProvider" ADD CONSTRAINT "CheckoutProvider_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
