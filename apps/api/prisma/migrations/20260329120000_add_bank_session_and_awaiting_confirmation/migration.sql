-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_CONFIRMATION';

-- CreateEnum
CREATE TYPE "BankTransferType" AS ENUM ('ACH', 'SEPA', 'LOCAL');

-- CreateTable
CREATE TABLE "BankSession" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "BankTransferType" NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "branchCode" TEXT,
    "amount" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankSession_paymentId_key" ON "BankSession"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "BankSession_reference_key" ON "BankSession"("reference");

-- CreateIndex
CREATE INDEX "BankSession_expiresAt_idx" ON "BankSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "BankSession" ADD CONSTRAINT "BankSession_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
