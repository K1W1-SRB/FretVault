-- CreateEnum
CREATE TYPE "public"."PracticeCategory" AS ENUM ('WARMUP', 'CHORDS', 'SCALES', 'SONGS', 'THEORY', 'EAR_TRAINING', 'COOL_DOWN');

-- CreateTable
CREATE TABLE "public"."PracticePlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PracticeItem" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" "public"."PracticeCategory" NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PracticeItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PracticePlan" ADD CONSTRAINT "PracticePlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PracticeItem" ADD CONSTRAINT "PracticeItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."PracticePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
