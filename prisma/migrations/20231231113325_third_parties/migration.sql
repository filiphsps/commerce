-- CreateTable
CREATE TABLE "ShopThirdParty" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "googleTagManager" TEXT,

    CONSTRAINT "ShopThirdParty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopThirdParty_shopId_idx" ON "ShopThirdParty"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopThirdParty_shopId_key" ON "ShopThirdParty"("shopId");
