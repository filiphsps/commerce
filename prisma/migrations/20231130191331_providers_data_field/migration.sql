/*
  Warnings:

  - You are about to drop the column `domain` on the `CommerceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `domain` on the `ContentProvider` table. All the data in the column will be lost.
  - Added the required column `data` to the `CommerceProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `ContentProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommerceProvider" DROP COLUMN "domain",
ADD COLUMN     "data" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ContentProvider" DROP COLUMN "domain",
ADD COLUMN     "data" JSONB NOT NULL;
