/*
  Warnings:

  - The `type` column on the `CommerceProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `ContentProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CommerceProviderType" AS ENUM ('shopify');

-- CreateEnum
CREATE TYPE "ContentProviderType" AS ENUM ('prismic', 'shopify');

-- AlterTable
ALTER TABLE "CommerceProvider" DROP COLUMN "type",
ADD COLUMN     "type" "CommerceProviderType" NOT NULL DEFAULT 'shopify';

-- AlterTable
ALTER TABLE "ContentProvider" DROP COLUMN "type",
ADD COLUMN     "type" "ContentProviderType" NOT NULL DEFAULT 'shopify';
