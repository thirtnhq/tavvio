-- AlterTable: add shortCode, viewCount, qrCodeUrl to PaymentLink
ALTER TABLE "PaymentLink" ADD COLUMN "shortCode" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PaymentLink" ADD COLUMN "qrCodeUrl" TEXT;

-- Backfill shortCode for existing rows (generate random 8-char codes)
UPDATE "PaymentLink" SET "shortCode" = substr(md5(random()::text), 1, 8) WHERE "shortCode" IS NULL;

-- Make shortCode NOT NULL and UNIQUE
ALTER TABLE "PaymentLink" ALTER COLUMN "shortCode" SET NOT NULL;
CREATE UNIQUE INDEX "PaymentLink_shortCode_key" ON "PaymentLink"("shortCode");

-- AlterTable: add linkId to Payment
ALTER TABLE "Payment" ADD COLUMN "linkId" TEXT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PaymentLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
