import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID!;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
    this.bucket = process.env.R2_BUCKET!;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new Error('Missing R2 env vars');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  async presignPutObject(args: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
      ContentType: args.contentType,
    });

    return getSignedUrl(this.s3, cmd, {
      expiresIn: args.expiresInSeconds ?? 900,
    });
  }

  async presignGetObject(args: {
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
    });

    return getSignedUrl(this.s3, cmd, {
      expiresIn: args.expiresInSeconds ?? 900,
    });
  }

  async headObject(key: string): Promise<HeadObjectCommandOutput> {
    const cmd = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return this.s3.send(cmd);
  }

  async deleteObject(key: string): Promise<void> {
    const cmd = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3.send(cmd);
  }
}
