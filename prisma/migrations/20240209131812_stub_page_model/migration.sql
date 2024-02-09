-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Page_shopId_idx" ON "Page"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_shopId_handle_key" ON "Page"("shopId", "handle");
