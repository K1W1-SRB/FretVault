-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "public"."Song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "ownerId" INTEGER NOT NULL,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    "tempo" INTEGER,
    "key" TEXT,
    "capo" INTEGER,
    "timeSigTop" INTEGER,
    "timeSigBot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tab" (
    "id" SERIAL NOT NULL,
    "songId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "tuning" TEXT NOT NULL,
    "tempo" INTEGER,
    "timeSigTop" INTEGER,
    "timeSigBot" INTEGER,
    "capo" INTEGER DEFAULT 0,
    "currentRev" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TabRevision" (
    "id" SERIAL NOT NULL,
    "tabId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "message" TEXT,
    "score" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TabRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TabRevision_tabId_number_key" ON "public"."TabRevision"("tabId", "number");

-- AddForeignKey
ALTER TABLE "public"."Song" ADD CONSTRAINT "Song_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tab" ADD CONSTRAINT "Tab_songId_fkey" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TabRevision" ADD CONSTRAINT "TabRevision_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "public"."Tab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
