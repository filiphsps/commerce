/*
  Warnings:

  - You are about to drop the column `accountId` on the `ShopCollaborator` table. All the data in the column will be lost.
  - Made the column `userId` on table `ShopCollaborator` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ShopCollaborator" DROP CONSTRAINT "ShopCollaborator_accountId_fkey";

-- DropForeignKey
ALTER TABLE "ShopCollaborator" DROP CONSTRAINT "ShopCollaborator_userId_fkey";

-- AlterTable
ALTER TABLE "ShopCollaborator" DROP COLUMN "accountId",
ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- AddForeignKey
ALTER TABLE "ShopCollaborator" ADD CONSTRAINT "ShopCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
