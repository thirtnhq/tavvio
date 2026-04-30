-- Add email verification + password reset state to Merchant
ALTER TABLE "Merchant"
  ADD COLUMN "emailVerifiedAt"           TIMESTAMP(3),
  ADD COLUMN "verificationCodeHash"      TEXT,
  ADD COLUMN "verificationCodeExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetTokenHash"    TEXT,
  ADD COLUMN "passwordResetExpiresAt"    TIMESTAMP(3);
