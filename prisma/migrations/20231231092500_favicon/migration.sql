-- AlterTable
ALTER TABLE "ShopIcons" ADD COLUMN     "faviconId" TEXT;

-- CreateTable
CREATE TABLE "ShopIconsImage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "src" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "shopIconsId" TEXT NOT NULL,

    CONSTRAINT "ShopIconsImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopIconsImage_shopIconsId_idx" ON "ShopIconsImage"("shopIconsId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopIconsImage_shopIconsId_key" ON "ShopIconsImage"("shopIconsId");
