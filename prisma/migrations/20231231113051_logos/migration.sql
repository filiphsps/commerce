-- DropIndex
DROP INDEX "BrandColor_shopBrandingId_key";

-- AlterTable
ALTER TABLE "ShopIconsImage" ADD COLUMN     "alt" TEXT;

-- CreateTable
CREATE TABLE "ShopLogosImage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "src" TEXT NOT NULL,
    "alt" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "shopLogosId" TEXT NOT NULL,
    "shopLogoAltsId" TEXT NOT NULL,

    CONSTRAINT "ShopLogosImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopLogos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "primaryId" TEXT,
    "alternativeId" TEXT,

    CONSTRAINT "ShopLogos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopLogosImage_shopLogosId_shopLogoAltsId_idx" ON "ShopLogosImage"("shopLogosId", "shopLogoAltsId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopLogosImage_shopLogosId_key" ON "ShopLogosImage"("shopLogosId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopLogosImage_shopLogoAltsId_key" ON "ShopLogosImage"("shopLogoAltsId");

-- CreateIndex
CREATE INDEX "ShopLogos_shopId_idx" ON "ShopLogos"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopLogos_shopId_key" ON "ShopLogos"("shopId");
