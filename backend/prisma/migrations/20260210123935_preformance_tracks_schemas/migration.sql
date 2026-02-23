-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('WAV', 'MP3', 'MP4');

-- CreateTable
CREATE TABLE "PerformanceProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTrack" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "gainDb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mute" BOOLEAN NOT NULL DEFAULT false,
    "solo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceClip" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "offsetInAssetMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "waveformPeaks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "outAssetId" TEXT,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "format" "ExportFormat" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceProject_workspaceId_idx" ON "PerformanceProject"("workspaceId");

-- CreateIndex
CREATE INDEX "PerformanceTrack_workspaceId_idx" ON "PerformanceTrack"("workspaceId");

-- CreateIndex
CREATE INDEX "PerformanceTrack_projectId_idx" ON "PerformanceTrack"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceTrack_projectId_index_key" ON "PerformanceTrack"("projectId", "index");

-- CreateIndex
CREATE INDEX "PerformanceClip_workspaceId_idx" ON "PerformanceClip"("workspaceId");

-- CreateIndex
CREATE INDEX "PerformanceClip_projectId_idx" ON "PerformanceClip"("projectId");

-- CreateIndex
CREATE INDEX "PerformanceClip_trackId_idx" ON "PerformanceClip"("trackId");

-- CreateIndex
CREATE INDEX "PerformanceClip_assetId_idx" ON "PerformanceClip"("assetId");

-- CreateIndex
CREATE INDEX "Asset_workspaceId_idx" ON "Asset"("workspaceId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_workspaceId_key_key" ON "Asset"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "ExportJob_workspaceId_idx" ON "ExportJob"("workspaceId");

-- CreateIndex
CREATE INDEX "ExportJob_projectId_idx" ON "ExportJob"("projectId");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- AddForeignKey
ALTER TABLE "PerformanceProject" ADD CONSTRAINT "PerformanceProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTrack" ADD CONSTRAINT "PerformanceTrack_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTrack" ADD CONSTRAINT "PerformanceTrack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PerformanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceClip" ADD CONSTRAINT "PerformanceClip_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceClip" ADD CONSTRAINT "PerformanceClip_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PerformanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceClip" ADD CONSTRAINT "PerformanceClip_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PerformanceTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceClip" ADD CONSTRAINT "PerformanceClip_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PerformanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_outAssetId_fkey" FOREIGN KEY ("outAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
