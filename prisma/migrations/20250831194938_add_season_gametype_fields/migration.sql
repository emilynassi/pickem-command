-- AlterTable
ALTER TABLE "public"."Prompt" ADD COLUMN     "gameType" INTEGER,
ADD COLUMN     "season" INTEGER;

-- CreateIndex
CREATE INDEX "Prompt_season_idx" ON "public"."Prompt"("season");

-- CreateIndex
CREATE INDEX "Prompt_gameType_idx" ON "public"."Prompt"("gameType");
