-- CreateTable
CREATE TABLE "ShopBranding" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "ShopBranding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopBranding_shopId_idx" ON "ShopBranding"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopBranding_shopId_key" ON "ShopBranding"("shopId");

-- AddForeignKey
ALTER TABLE "ShopBranding" ADD CONSTRAINT "ShopBranding_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
