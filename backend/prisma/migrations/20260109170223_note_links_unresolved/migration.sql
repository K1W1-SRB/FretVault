/*
  Warnings:

  - A unique constraint covering the columns `[fromNoteId,toSlug]` on the table `NoteLink` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `toSlug` to the `NoteLink` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."NoteLink" DROP CONSTRAINT "NoteLink_toNoteId_fkey";

-- DropIndex
DROP INDEX "public"."NoteLink_fromNoteId_toNoteId_key";

-- AlterTable
ALTER TABLE "public"."NoteLink" ADD COLUMN     "alias" TEXT,
ADD COLUMN     "toSlug" TEXT NOT NULL,
ALTER COLUMN "toNoteId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "NoteLink_toSlug_idx" ON "public"."NoteLink"("toSlug");

-- CreateIndex
CREATE UNIQUE INDEX "NoteLink_fromNoteId_toSlug_key" ON "public"."NoteLink"("fromNoteId", "toSlug");

-- AddForeignKey
ALTER TABLE "public"."NoteLink" ADD CONSTRAINT "NoteLink_toNoteId_fkey" FOREIGN KEY ("toNoteId") REFERENCES "public"."Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
