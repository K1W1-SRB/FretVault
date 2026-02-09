-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SOLO', 'BAND');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PracticeCategory" AS ENUM ('WARMUP', 'CHORDS', 'SCALES', 'SONGS', 'THEORY', 'EAR_TRAINING', 'COOL_DOWN');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'BAND');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PracticeTargetType" AS ENUM ('SONG', 'NOTE', 'DRILL', 'BLOCK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FocusMetricType" AS ENUM ('BPM', 'ACCURACY', 'REPS', 'NOTES', 'NONE');

-- CreateEnum
CREATE TYPE "FocusDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'SOLO',
    "avatar" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "ownerId" INTEGER NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "tempo" INTEGER,
    "key" TEXT,
    "capo" INTEGER,
    "timeSigTop" INTEGER,
    "timeSigBot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workspaceId" TEXT,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tab" (
    "id" SERIAL NOT NULL,
    "songId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "tuning" TEXT NOT NULL,
    "tempo" INTEGER,
    "timeSigTop" INTEGER,
    "timeSigBot" INTEGER,
    "capo" INTEGER DEFAULT 0,
    "currentRev" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabRevision" (
    "id" SERIAL NOT NULL,
    "tabId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "message" TEXT,
    "score" JSONB NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TabRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticePlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceNoteSlug" TEXT,
    "sourceNoteTitle" TEXT,
    "workspaceId" TEXT,

    CONSTRAINT "PracticePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeItem" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PracticeCategory" NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PracticeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "metricType" "FocusMetricType" NOT NULL,
    "metricValue" DOUBLE PRECISION,
    "difficulty" "FocusDifficulty",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "PracticeTargetType" NOT NULL,
    "refId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "frontmatter" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("noteId","tagId")
);

-- CreateTable
CREATE TABLE "NoteLink" (
    "id" TEXT NOT NULL,
    "fromNoteId" TEXT NOT NULL,
    "toNoteId" TEXT,
    "toSlug" TEXT NOT NULL,
    "alias" TEXT,
    "raw" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteBlock" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Song_ownerId_idx" ON "Song"("ownerId");

-- CreateIndex
CREATE INDEX "Song_workspaceId_idx" ON "Song"("workspaceId");

-- CreateIndex
CREATE INDEX "Tab_songId_idx" ON "Tab"("songId");

-- CreateIndex
CREATE INDEX "TabRevision_tabId_idx" ON "TabRevision"("tabId");

-- CreateIndex
CREATE UNIQUE INDEX "TabRevision_tabId_number_key" ON "TabRevision"("tabId", "number");

-- CreateIndex
CREATE INDEX "PracticePlan_ownerId_idx" ON "PracticePlan"("ownerId");

-- CreateIndex
CREATE INDEX "PracticePlan_workspaceId_idx" ON "PracticePlan"("workspaceId");

-- CreateIndex
CREATE INDEX "PracticeItem_planId_idx" ON "PracticeItem"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_type_idx" ON "Workspace"("type");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_role_idx" ON "WorkspaceMember"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Note_workspaceId_updatedAt_idx" ON "Note"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Note_workspaceId_visibility_idx" ON "Note"("workspaceId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Note_workspaceId_slug_key" ON "Note"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "Tag_workspaceId_name_idx" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "NoteTag_tagId_idx" ON "NoteTag"("tagId");

-- CreateIndex
CREATE INDEX "NoteLink_fromNoteId_idx" ON "NoteLink"("fromNoteId");

-- CreateIndex
CREATE INDEX "NoteLink_toNoteId_idx" ON "NoteLink"("toNoteId");

-- CreateIndex
CREATE INDEX "NoteLink_toSlug_idx" ON "NoteLink"("toSlug");

-- CreateIndex
CREATE UNIQUE INDEX "NoteLink_fromNoteId_toSlug_key" ON "NoteLink"("fromNoteId", "toSlug");

-- CreateIndex
CREATE INDEX "NoteBlock_noteId_type_idx" ON "NoteBlock"("noteId", "type");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabRevision" ADD CONSTRAINT "TabRevision_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePlan" ADD CONSTRAINT "PracticePlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePlan" ADD CONSTRAINT "PracticePlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeItem" ADD CONSTRAINT "PracticeItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PracticePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PracticeTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_fromNoteId_fkey" FOREIGN KEY ("fromNoteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_toNoteId_fkey" FOREIGN KEY ("toNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteBlock" ADD CONSTRAINT "NoteBlock_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
