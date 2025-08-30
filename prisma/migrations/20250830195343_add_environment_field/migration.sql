-- AlterTable
ALTER TABLE "public"."Prompt" ADD COLUMN     "environment" TEXT NOT NULL DEFAULT 'production';

-- CreateIndex
CREATE INDEX "Prompt_environment_idx" ON "public"."Prompt"("environment");
