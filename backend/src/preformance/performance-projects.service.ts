import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { readFile, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaService } from 'prisma/prisma.service';
import { R2StorageService } from 'src/storage/r2-storage.service';
import { CreatePerformanceProjectDto } from './dto/create-performance-project.dto';
import { ExportPerformanceProjectMp4Dto } from './dto/export-performance-project-mp4.dto';
import { UpdatePerformanceProjectDto } from './dto/update-performance-project.dto';

type UploadedCoverImage = {
  buffer: Buffer;
  mimetype?: string;
};

const AUDIO_EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
};

const IMAGE_EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type RenderClip = {
  startMs: number;
  durationMs: number;
  offsetInAssetMs: number;
  gainDb: number;
  pan: number;
  assetId: string;
  assetKey: string;
  assetContentType: string;
};

@Injectable()
export class PerformanceProjectService {
  private readonly logger = new Logger(PerformanceProjectService.name);
  private readonly assetDownloadTimeoutMs =
    Number(process.env.EXPORT_ASSET_DOWNLOAD_TIMEOUT_MS ?? '45000') || 45000;
  private readonly renderTimeoutMs =
    Number(process.env.EXPORT_RENDER_TIMEOUT_MS ?? '300000') || 300000;

  constructor(
    private prisma: PrismaService,
    private storage: R2StorageService,
  ) {}

  async create(dto: CreatePerformanceProjectDto, workspaceId: string) {
    return this.prisma.performanceProject.create({
      data: { ...dto, workspaceId },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.performanceProject.findMany({
      where: {
        workspaceId: workspaceId,
      },
    });
  }

  async findOne(workspaceId: string, projectId: string) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Performance project is not in workspace');
    }

    return project;
  }

  async findOneTimeline(projectId: string, userId: number) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: project.workspaceId, userId },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a workspace member');
    }

    const projectWithTimeline = await this.prisma.performanceProject.findUnique(
      {
        where: { id: projectId },
        include: {
          tracks: {
            orderBy: { index: 'asc' },
            include: {
              clips: {
                orderBy: { startMs: 'asc' },
                include: {
                  asset: {
                    select: {
                      id: true,
                      contentType: true,
                      byteSize: true,
                      durationMs: true,
                      status: true,
                      waveformPeaks: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    if (!projectWithTimeline) {
      throw new NotFoundException('Performance project not found');
    }

    const { tracks, ...projectData } = projectWithTimeline;

    return {
      project: projectData,
      tracks,
    };
  }

  async update(
    dto: UpdatePerformanceProjectDto,
    workspaceId: string,
    projectId: string,
  ) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Performance Porject is not in workspace');
    }

    const updatedProject = await this.prisma.performanceProject.update({
      where: { id: projectId },
      data: { ...dto },
    });

    return updatedProject;
  }

  async delete(workspaceId: string, projectId: string) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Performance Project is not in workspace');
    }

    return await this.prisma.performanceProject.delete({
      where: { id: projectId },
    });
  }

  async exportMp4(
    projectId: string,
    userId: number,
    dto: ExportPerformanceProjectMp4Dto,
    coverImage?: UploadedCoverImage,
  ) {
    const exportStartedAt = Date.now();
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
      include: {
        tracks: {
          orderBy: { index: 'asc' },
          include: {
            clips: {
              orderBy: { startMs: 'asc' },
              include: {
                asset: {
                  select: {
                    id: true,
                    key: true,
                    workspaceId: true,
                    contentType: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    await this.ensureWorkspaceMembership(project.workspaceId, userId);

    const soloTracks = project.tracks.filter((track) => track.solo);
    const tracksToExport =
      soloTracks.length > 0
        ? soloTracks
        : project.tracks.filter((track) => !track.mute);

    const clips: RenderClip[] = [];
    for (const track of tracksToExport) {
      for (const clip of track.clips) {
        if (clip.durationMs <= 0) {
          continue;
        }

        if (!clip.asset || clip.asset.status !== AssetStatus.VERIFIED) {
          throw new BadRequestException(
            `Clip ${clip.id} uses an asset that is not ready for export`,
          );
        }

        if (clip.asset.workspaceId !== project.workspaceId) {
          throw new ForbiddenException(
            'Clip asset is not in project workspace',
          );
        }

        clips.push({
          startMs: clip.startMs,
          durationMs: clip.durationMs,
          offsetInAssetMs: clip.offsetInAssetMs,
          gainDb: track.gainDb,
          pan: track.pan,
          assetId: clip.asset.id,
          assetKey: clip.asset.key,
          assetContentType: clip.asset.contentType,
        });
      }
    }

    if (clips.length === 0) {
      throw new BadRequestException('No playable clips found to export');
    }

    const outputDurationMs = clips.reduce((maxMs, clip) => {
      const endMs = Math.max(0, clip.startMs) + Math.max(1, clip.durationMs);
      return Math.max(maxMs, endMs);
    }, 0);
    if (outputDurationMs <= 0) {
      throw new BadRequestException('Computed export duration is invalid');
    }

    this.logger.log(
      `Starting MP4 export for project=${projectId} clips=${clips.length} durationMs=${outputDurationMs}`,
    );

    const tempDir = await mkdtemp(join(tmpdir(), 'fretvault-export-'));
    try {
      const localAssets = new Map<string, string>();
      this.logger.log(
        `Resolving source assets for project=${projectId} uniqueAssets=${new Set(clips.map((clip) => clip.assetId)).size}`,
      );

      for (const clip of clips) {
        if (localAssets.has(clip.assetId)) {
          continue;
        }

        const assetExt = this.resolveAudioExt(
          clip.assetContentType,
          clip.assetKey,
        );
        const assetPath = join(
          tempDir,
          `asset-${localAssets.size + 1}.${assetExt}`,
        );
        const assetUrl = await this.storage.presignGetObject({
          key: clip.assetKey,
          expiresInSeconds: 900,
        });
        this.logger.log(
          `Downloading asset for export project=${projectId} assetId=${clip.assetId}`,
        );
        const downloadStartedAt = Date.now();
        await this.downloadToFile(assetUrl, assetPath);
        this.logger.log(
          `Downloaded asset for export project=${projectId} assetId=${clip.assetId} elapsedMs=${Date.now() - downloadStartedAt}`,
        );
        localAssets.set(clip.assetId, assetPath);
      }
      this.logger.log(
        `Completed source asset preparation for project=${projectId}`,
      );

      let coverPath: string | null = null;
      if (coverImage?.buffer?.length) {
        const contentType = (coverImage.mimetype ?? '').toLowerCase().trim();
        const imageExt = IMAGE_EXT_BY_CONTENT_TYPE[contentType];

        if (!imageExt) {
          throw new BadRequestException(
            'Unsupported cover image type. Use jpg, png, or webp.',
          );
        }

        coverPath = join(tempDir, `cover.${imageExt}`);
        await writeFile(coverPath, coverImage.buffer);
      }

      const fileStem = this.sanitizeFileName(dto.fileName || project.name);
      const outputName = `${fileStem}.mp4`;
      const outputPath = join(tempDir, outputName);

      const filterParts: string[] = [
        '[0:v]scale=1400:1400:force_original_aspect_ratio=decrease,pad=1400:1400:(ow-iw)/2:(oh-ih)/2,format=yuv420p[vout]',
      ];

      const audioLabels: string[] = [];
      clips.forEach((clip, index) => {
        const inputIndex = index + 1;
        const clipStartSec = (clip.offsetInAssetMs / 1000).toFixed(3);
        const clipEndSec = (
          (clip.offsetInAssetMs + clip.durationMs) /
          1000
        ).toFixed(3);
        const clipDelayMs = Math.max(0, Math.round(clip.startMs));
        const gain = Math.max(0, Math.pow(10, clip.gainDb / 20));
        const pan = Math.max(-1, Math.min(1, clip.pan));
        const leftGain = pan <= 0 ? 1 : 1 - pan;
        const rightGain = pan >= 0 ? 1 : 1 + pan;

        filterParts.push(
          `[${inputIndex}:a]atrim=start=${clipStartSec}:end=${clipEndSec},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,pan=stereo|c0=${leftGain.toFixed(4)}*c0|c1=${rightGain.toFixed(4)}*c1,volume=${gain.toFixed(6)},adelay=${clipDelayMs}:all=1[a${index}]`,
        );
        audioLabels.push(`[a${index}]`);
      });

      if (audioLabels.length === 1) {
        filterParts.push(
          `${audioLabels[0]}aresample=${project.sampleRate},alimiter=limit=0.95[aout]`,
        );
      } else {
        filterParts.push(
          `${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0,aresample=${project.sampleRate},alimiter=limit=0.95[aout]`,
        );
      }

      const metadataTitle =
        this.sanitizeMetadata(dto.title) || project.name || fileStem;
      const metadataArtist =
        this.sanitizeMetadata(dto.artist) || 'Unknown Artist';
      const metadataAlbum = this.sanitizeMetadata(dto.album);
      const metadataGenre = this.sanitizeMetadata(dto.genre);
      const metadataComposer = this.sanitizeMetadata(dto.composer);
      const metadataComment = this.sanitizeMetadata(dto.comment);
      const metadataYear = this.parseOptionalInt(dto.year, 'year', 1000, 3000);
      const metadataTrack = this.parseOptionalInt(
        dto.trackNumber,
        'trackNumber',
        1,
        999,
      );

      const ffmpegArgs: string[] = ['-y'];

      if (coverPath) {
        ffmpegArgs.push('-loop', '1', '-i', coverPath);
      } else {
        ffmpegArgs.push('-f', 'lavfi', '-i', 'color=c=#101820:s=1400x1400');
      }

      clips.forEach((clip) => {
        const localPath = localAssets.get(clip.assetId);
        if (!localPath) {
          throw new BadRequestException('Missing local asset for export');
        }
        ffmpegArgs.push('-i', localPath);
      });

      ffmpegArgs.push(
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[vout]',
        '-map',
        '[aout]',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-tune',
        'stillimage',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        '-t',
        (outputDurationMs / 1000).toFixed(3),
        '-shortest',
        '-metadata',
        `title=${metadataTitle}`,
        '-metadata',
        `artist=${metadataArtist}`,
      );

      if (metadataAlbum) {
        ffmpegArgs.push('-metadata', `album=${metadataAlbum}`);
      }
      if (metadataGenre) {
        ffmpegArgs.push('-metadata', `genre=${metadataGenre}`);
      }
      if (metadataComposer) {
        ffmpegArgs.push('-metadata', `composer=${metadataComposer}`);
      }
      if (metadataComment) {
        ffmpegArgs.push('-metadata', `comment=${metadataComment}`);
      }
      if (metadataYear) {
        ffmpegArgs.push('-metadata', `date=${metadataYear}`);
      }
      if (metadataTrack) {
        ffmpegArgs.push('-metadata', `track=${metadataTrack}`);
      }

      ffmpegArgs.push(outputPath);

      this.logger.log(
        `Running FFmpeg for project=${projectId} inputs=${clips.length + 1} renderTimeoutMs=${this.renderTimeoutMs}`,
      );
      await this.runFfmpeg(ffmpegArgs);
      this.logger.log(`FFmpeg finished for project=${projectId}`);
      const buffer = await readFile(outputPath);
      const elapsed = Date.now() - exportStartedAt;
      this.logger.log(
        `Finished MP4 export for project=${projectId} in ${elapsed}ms`,
      );

      return {
        fileName: outputName,
        mimeType: 'video/mp4',
        buffer,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private sanitizeMetadata(value: unknown) {
    const asString = this.toTrimmedString(value);
    if (!asString) return '';
    return this.stripControlChars(asString);
  }

  private sanitizeFileName(raw: string) {
    const normalized = this.stripControlChars(raw ?? '')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
    const fallback = 'performance-export';
    const base = normalized || fallback;
    return base.slice(0, 120);
  }

  private resolveAudioExt(contentType: string, key: string) {
    const normalizedType = (contentType ?? '').toLowerCase().trim();
    const mapped = AUDIO_EXT_BY_CONTENT_TYPE[normalizedType];
    if (mapped) return mapped;

    const fromKey = key.split('.').pop()?.toLowerCase().trim();
    if (fromKey) return fromKey;

    return 'bin';
  }

  private async ensureWorkspaceMembership(workspaceId: string, userId: number) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a workspace member');
    }
  }

  private parseOptionalInt(
    value: unknown,
    fieldName: string,
    min: number,
    max: number,
  ) {
    const raw = this.toTrimmedString(value);
    if (!raw) {
      return undefined;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(
        `${fieldName} must be an integer between ${min} and ${max}`,
      );
    }

    return parsed;
  }

  private async downloadToFile(url: string, filePath: string) {
    const abortController = new AbortController();
    const timer = setTimeout(() => {
      abortController.abort();
    }, this.assetDownloadTimeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { signal: abortController.signal });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new BadRequestException(
          'Timed out while downloading one of the source audio assets.',
        );
      }
      throw new BadRequestException(
        'Failed to download source audio asset.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new BadRequestException('Failed to download source audio asset');
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(filePath, bytes);
  }

  private async runFfmpeg(args: string[]) {
    const ffmpegBinary = this.resolveFfmpegBinary();

    await new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();
      const child = spawn(ffmpegBinary, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let settled = false;
      let timedOut = false;
      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      const heartbeat = setInterval(() => {
        this.logger.log(
          `FFmpeg still running elapsedMs=${Date.now() - startedAt}`,
        );
      }, 30000);

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, this.renderTimeoutMs);

      child.on('error', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(heartbeat);
        reject(
          new BadRequestException(
            'FFmpeg could not be started. Set FFMPEG_PATH or install FFmpeg.',
          ),
        );
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(heartbeat);

        if (timedOut) {
          reject(
            new BadRequestException(
              `MP4 export timed out after ${this.renderTimeoutMs}ms while rendering.`,
            ),
          );
          return;
        }

        if (code === 0) {
          resolve();
          return;
        }

        const errorTail = stderr.trim().slice(-800);
        reject(
          new BadRequestException(
            `MP4 export failed while rendering audio/video (${errorTail || 'ffmpeg exited with a non-zero code'})`,
          ),
        );
      });
    });
  }

  private resolveFfmpegBinary() {
    const fromEnv = process.env.FFMPEG_PATH?.trim();
    if (fromEnv) return fromEnv;

    if (typeof ffmpegStatic === 'string' && ffmpegStatic.trim()) {
      return ffmpegStatic;
    }

    return 'ffmpeg';
  }

  private toTrimmedString(value: unknown) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value}`.trim();
    }

    return '';
  }

  private stripControlChars(value: string) {
    let out = '';
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if (code < 32 || code === 127) {
        continue;
      }
      out += value[i];
    }
    return out;
  }
}
