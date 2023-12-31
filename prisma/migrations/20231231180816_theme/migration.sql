-- CreateTable
CREATE TABLE "ShopTheme" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ShopTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopTheme_shopId_idx" ON "ShopTheme"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopTheme_shopId_key" ON "ShopTheme"("shopId");
