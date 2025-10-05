/*
  Warnings:

  - The `currentRev` column on the `Tab` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Tab" DROP COLUMN "currentRev",
ADD COLUMN     "currentRev" INTEGER;
