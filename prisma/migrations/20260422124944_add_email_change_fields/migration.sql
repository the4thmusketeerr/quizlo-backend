-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_change_expiry" TIMESTAMP(3),
ADD COLUMN     "email_change_token" TEXT,
ADD COLUMN     "pending_email" TEXT;

-- CreateIndex
CREATE INDEX "users_email_change_token_idx" ON "users"("email_change_token");
