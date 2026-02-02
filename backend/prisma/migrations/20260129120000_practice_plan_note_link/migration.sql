-- Add source note metadata to practice plans
ALTER TABLE "public"."PracticePlan"
ADD COLUMN "sourceNoteSlug" TEXT,
ADD COLUMN "sourceNoteTitle" TEXT;
