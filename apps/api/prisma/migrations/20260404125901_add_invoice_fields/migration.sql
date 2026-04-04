/*
  Warnings:

  - Added the required column `updatedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountPaid" DECIMAL(36,18) NOT NULL DEFAULT 0,
ADD COLUMN     "customerAddress" JSONB,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Backfill existing rows, then drop the default so Prisma manages it going forward
ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Invoice_merchantId_idx" ON "Invoice"("merchantId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
