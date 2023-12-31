-- CreateTable
CREATE TABLE "ShopIcons" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "ShopIcons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopIcons_shopId_idx" ON "ShopIcons"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopIcons_shopId_key" ON "ShopIcons"("shopId");
