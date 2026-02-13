import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { R2StorageService } from 'src/storage/r2-storage.service';
import { BulkDownloadUrlsDto } from './dto/bulk-download-urls.dto';
import { FinalizeAssetDto } from './dto/finalize-asset.dto';
import { PresignAssetDto } from './dto/presign-asset.dto';

type RateEntry = { count: number; resetAtMs: number };

class SimpleRateLimiter {
  private readonly hits = new Map<string, RateEntry>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  check(key: string) {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now > entry.resetAtMs) {
      this.hits.set(key, { count: 1, resetAtMs: now + this.windowMs });
      return;
    }

    if (entry.count >= this.maxRequests) {
      throw new BadRequestException('Too many presign requests');
    }

    entry.count += 1;
  }
}

const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  'audio/wav': ['wav'],
  'audio/x-wav': ['wav'],
  'audio/mpeg': ['mp3', 'mpeg'],
  'audio/webm': ['webm'],
  'audio/ogg': ['ogg', 'oga'],
  'audio/flac': ['flac'],
  'audio/aac': ['aac'],
  'audio/mp4': ['m4a', 'mp4'],
};

@Injectable()
export class AssetsService implements OnModuleInit, OnModuleDestroy {
  private readonly presignTtlSec: number;
  private readonly maxBytes: number;
  private readonly rateLimiter: SimpleRateLimiter;
  private readonly cleanupIntervalMs: number;
  private readonly cleanupMaxAgeMs: number;
  private readonly cleanupDeleteR2: boolean;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: R2StorageService,
  ) {
    this.presignTtlSec = Number(process.env.ASSET_PRESIGN_TTL_SEC ?? '900');
    this.maxBytes = Number(
      process.env.ASSET_MAX_BYTES ?? `${200 * 1024 * 1024}`,
    );
    const rateLimit = Number(process.env.ASSET_PRESIGN_RATE_LIMIT ?? '10');
    const rateWindowSec = Number(
      process.env.ASSET_PRESIGN_RATE_WINDOW_SEC ?? '60',
    );
    this.rateLimiter = new SimpleRateLimiter(rateLimit, rateWindowSec * 1000);
    this.cleanupIntervalMs =
      Number(process.env.ASSET_CLEANUP_INTERVAL_MINUTES ?? '30') * 60 * 1000;
    this.cleanupMaxAgeMs =
      Number(process.env.ASSET_CLEANUP_MAX_AGE_HOURS ?? '6') * 60 * 60 * 1000;
    this.cleanupDeleteR2 = process.env.ASSET_CLEANUP_DELETE_R2 === 'true';
  }

  onModuleInit() {
    void this.cleanupPendingUploads().catch(() => undefined);
    this.cleanupTimer = setInterval(() => {
      void this.cleanupPendingUploads().catch(() => undefined);
    }, this.cleanupIntervalMs);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private normalizeExt(fileExt: string): string {
    const ext = (fileExt ?? '').trim().toLowerCase().replace(/^\./, '');
    if (!ext) throw new BadRequestException('fileExt is required');
    return ext;
  }

  private normalizeContentType(contentType: string): string {
    const ct = (contentType ?? '').trim().toLowerCase();
    if (!ct) throw new BadRequestException('contentType is required');
    return ct;
  }

  private validateContentType(contentType: string, fileExt: string) {
    const allowedExts = ALLOWED_CONTENT_TYPES[contentType];
    if (!allowedExts || !allowedExts.includes(fileExt)) {
      throw new BadRequestException('Unsupported contentType or fileExt');
    }
  }

  private async ensureMembership(workspaceId: string, userId: number) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true },
    });
    if (!m) throw new ForbiddenException('Not a workspace member');
  }

  async presign(dto: PresignAssetDto, userId: number) {
    if (!dto?.workspaceId)
      throw new BadRequestException('workspaceId is required');
    this.rateLimiter.check(`${userId}:${dto.workspaceId}`);
    await this.ensureMembership(dto.workspaceId, userId);

    const contentType = this.normalizeContentType(dto.contentType);
    const fileExt = this.normalizeExt(dto.fileExt);
    this.validateContentType(contentType, fileExt);

    if (dto.byteSizeEstimate && dto.byteSizeEstimate > this.maxBytes) {
      throw new BadRequestException('File too large');
    }

    const assetId = randomUUID();
    const key = `workspaces/${dto.workspaceId}/performance-assets/${assetId}.${fileExt}`;

    await this.prisma.asset.create({
      data: {
        id: assetId,
        workspaceId: dto.workspaceId,
        key,
        bucket: this.storage.getBucket(),
        contentType,
        byteSize: dto.byteSizeEstimate ?? null,
        status: AssetStatus.PENDING_UPLOAD,
      },
    });

    const putUrl = await this.storage.presignPutObject({
      key,
      contentType,
      expiresInSeconds: this.presignTtlSec,
    });

    return {
      assetId,
      key,
      putUrl,
      expiresAt: new Date(Date.now() + this.presignTtlSec * 1000).toISOString(),
    };
  }

  async finalize(assetId: string, dto: FinalizeAssetDto, userId: number) {
    if (!assetId) throw new BadRequestException('Missing assetId');

    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    await this.ensureMembership(asset.workspaceId, userId);

    if (asset.status === AssetStatus.FAILED) {
      throw new BadRequestException('Asset is in failed state');
    }

    if (asset.status !== AssetStatus.PENDING_UPLOAD) {
      throw new BadRequestException('Asset is not in PENDING_UPLOAD state');
    }

    let head;
    try {
      head = await this.storage.headObject(asset.key);
    } catch {
      throw new BadRequestException('Uploaded object not found');
    }

    const contentLength = head.ContentLength ?? null;
    const contentType = (head.ContentType ?? '').toLowerCase();

    if (!contentLength) {
      throw new BadRequestException('Unable to verify object size');
    }
    if (contentLength !== dto.byteSize) {
      throw new BadRequestException('Size mismatch');
    }
    if (!contentType || contentType !== asset.contentType.toLowerCase()) {
      throw new BadRequestException('Content-Type mismatch');
    }

    return this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        byteSize: dto.byteSize,
        ...(dto.sha256 ? { sha256: dto.sha256 } : {}),
        durationMs: dto.durationMs,
        sampleRate: dto.sampleRate,
        channels: dto.channels,
        status: AssetStatus.VERIFIED,
      },
    });
  }

  async getDownloadUrl(assetId: string, userId: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.ensureMembership(asset.workspaceId, userId);
    if (asset.status !== AssetStatus.VERIFIED) {
      throw new BadRequestException('Asset is not ready for download');
    }

    const url = await this.storage.presignGetObject({
      key: asset.key,
      expiresInSeconds: this.presignTtlSec,
    });

    return {
      assetId: asset.id,
      key: asset.key,
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      url,
      expiresAt: new Date(Date.now() + this.presignTtlSec * 1000).toISOString(),
    };
  }

  async getDownloadUrls(dto: BulkDownloadUrlsDto, userId: number) {
    const assetIds = Array.from(
      new Set((dto.assetIds ?? []).map((id) => id?.trim()).filter(Boolean)),
    );

    if (assetIds.length === 0) {
      throw new BadRequestException('assetIds is required');
    }

    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds } },
    });

    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more assets not found');
    }

    const expiresAt = new Date(
      Date.now() + this.presignTtlSec * 1000,
    ).toISOString();
    const urls: Record<string, { url: string; expiresAt: string }> = {};

    for (const asset of assets) {
      await this.ensureMembership(asset.workspaceId, userId);
      if (asset.status !== AssetStatus.VERIFIED) {
        throw new BadRequestException(
          `Asset ${asset.id} is not ready for download`,
        );
      }

      const url = await this.storage.presignGetObject({
        key: asset.key,
        expiresInSeconds: this.presignTtlSec,
      });

      urls[asset.id] = { url, expiresAt };
    }

    return { urls };
  }

  private async cleanupPendingUploads() {
    const cutoff = new Date(Date.now() - this.cleanupMaxAgeMs);
    const stale = await this.prisma.asset.findMany({
      where: {
        status: AssetStatus.PENDING_UPLOAD,
        createdAt: { lt: cutoff },
      },
      select: { id: true, key: true },
    });

    if (stale.length === 0) return;

    if (this.cleanupDeleteR2) {
      await Promise.allSettled(
        stale.map((asset) => this.storage.deleteObject(asset.key)),
      );
    }

    await this.prisma.asset.deleteMany({
      where: { id: { in: stale.map((asset) => asset.id) } },
    });
  }
}
