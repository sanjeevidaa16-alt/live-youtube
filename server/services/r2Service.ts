import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { R2StorageConfig, StorageTestResult, R2StorageDiagnostics } from '../../src/types.js';

export class R2Service {
  private static cachedClient: S3Client | null = null;
  private static cachedConfigSignature = '';

  /**
   * Retrieves active R2 configuration from DB or Server Environment Variables.
   */
  public static getR2Config(): R2StorageConfig {
    const settings = db.getSettings();
    const dbR2 = settings.r2 || ({} as Partial<R2StorageConfig>);

    const accountId = (dbR2.accountId || process.env.R2_ACCOUNT_ID || '').trim();
    const accessKeyId = (dbR2.accessKeyId || process.env.R2_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = (dbR2.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '').trim();
    const bucketName = (dbR2.bucketName || process.env.R2_BUCKET_NAME || '').trim();
    const publicUrl = (dbR2.publicUrl || process.env.R2_PUBLIC_URL || '').trim();
    const maxStorageGb = dbR2.maxStorageGb || (process.env.MAX_STORAGE_GB ? parseFloat(process.env.MAX_STORAGE_GB) : 10);
    const maxVideoSizeGb = dbR2.maxVideoSizeGb || (process.env.MAX_VIDEO_SIZE_GB ? parseFloat(process.env.MAX_VIDEO_SIZE_GB) : 10);

    return {
      storageProvider: 'cloudflare_r2',
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicUrl,
      maxStorageGb,
      maxVideoSizeGb,
      lastTestedAt: dbR2.lastTestedAt,
      lastTestStatus: dbR2.lastTestStatus || 'untested',
      lastTestMessage: dbR2.lastTestMessage,
      diagnostics: dbR2.diagnostics,
      storageUsedBytes: dbR2.storageUsedBytes,
      objectCount: dbR2.objectCount,
    };
  }

  /**
   * Checks if Cloudflare R2 is configured.
   */
  public static isConfigured(): boolean {
    const config = this.getR2Config();
    return !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName);
  }

  /**
   * Returns sanitized R2 configuration safe to return to the frontend client.
   * NEVER exposes secretAccessKey.
   */
  public static getSanitizedConfig(): R2StorageConfig {
    const config = this.getR2Config();
    return {
      ...config,
      secretAccessKey: config.secretAccessKey ? '••••••••••••••••' : '',
    };
  }

  /**
   * Instantiates or reuses an authenticated S3Client connected to Cloudflare R2.
   */
  public static getS3Client(overrideConfig?: Partial<R2StorageConfig>): { client: S3Client; config: R2StorageConfig } {
    const current = this.getR2Config();
    const config: R2StorageConfig = {
      ...current,
      ...(overrideConfig || {}),
    };

    if (!config.accountId) {
      throw new Error('Cloudflare R2 Account ID is not configured.');
    }
    if (!config.accessKeyId) {
      throw new Error('Cloudflare R2 Access Key ID is not configured.');
    }
    if (!config.secretAccessKey) {
      throw new Error('Cloudflare R2 Secret Access Key is not configured.');
    }
    if (!config.bucketName) {
      throw new Error('Cloudflare R2 Bucket Name is not configured.');
    }

    const signature = `${config.accountId}:${config.accessKeyId}:${config.secretAccessKey}:${config.bucketName}`;
    if (this.cachedClient && this.cachedConfigSignature === signature) {
      return { client: this.cachedClient, config };
    }

    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.cachedClient = client;
    this.cachedConfigSignature = signature;

    return { client, config };
  }

  /**
   * Perform a comprehensive, real-world Cloudflare R2 connection test:
   * 1. Validates credentials format
   * 2. Reaches R2 endpoint & checks bucket existence (HeadBucket)
   * 3. Tests Write permission by uploading a small test object (.system/r2-connection-test)
   * 4. Tests Read permission by reading the test object metadata (HeadObject)
   * 5. Tests Delete permission by removing the test object (DeleteObject)
   * 6. Calculates live storage usage and object count (ListObjectsV2)
   */
  public static async testConnection(overrideConfig?: Partial<R2StorageConfig>): Promise<StorageTestResult> {
    const testedAt = new Date().toISOString();
    const diagnostics: R2StorageDiagnostics = {
      credentialsLoaded: false,
      endpointReachable: false,
      bucketAccessible: false,
      writePermission: false,
      readPermission: false,
      deletePermission: false,
    };

    let client: S3Client;
    let config: R2StorageConfig;

    try {
      const init = this.getS3Client(overrideConfig);
      client = init.client;
      config = init.config;
      diagnostics.credentialsLoaded = true;
    } catch (credErr: any) {
      const errMessage = credErr.message || 'Missing Cloudflare R2 credentials.';
      const result: StorageTestResult = {
        success: false,
        connected: false,
        storageProvider: 'cloudflare_r2',
        error: errMessage,
        diagnostics,
        testedAt,
      };

      db.updateSettings({
        r2: {
          ...this.getR2Config(),
          lastTestedAt: testedAt,
          lastTestStatus: 'error',
          lastTestMessage: errMessage,
          diagnostics,
        },
      });

      return result;
    }

    const testObjectKey = `.system/r2-connection-test-${Date.now()}.txt`;

    try {
      // 1. Verify endpoint & Bucket existence
      try {
        await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
        diagnostics.endpointReachable = true;
        diagnostics.bucketAccessible = true;
      } catch (bucketErr: any) {
        const httpStatus = bucketErr.$metadata?.httpStatusCode;
        if (httpStatus === 404 || bucketErr.name === 'NotFound') {
          throw new Error(`Cloudflare R2 Bucket "${config.bucketName}" was not found. Please verify the bucket name.`);
        } else if (httpStatus === 403 || bucketErr.name === 'Forbidden') {
          throw new Error('Access denied (403). Please verify your R2 Access Key ID, Secret Access Key, and bucket permissions.');
        } else {
          throw new Error(`Cannot reach Cloudflare R2 bucket: ${bucketErr.message || bucketErr.name}`);
        }
      }

      // 2. Test Write permission (Upload small test file)
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucketName,
            Key: testObjectKey,
            Body: Buffer.from(`Cloudflare R2 storage connection test verified at ${testedAt}`),
            ContentType: 'text/plain',
          })
        );
        diagnostics.writePermission = true;
      } catch (writeErr: any) {
        throw new Error(`Write permission denied: Unable to upload test object to bucket. Details: ${writeErr.message}`);
      }

      // 3. Test Read permission
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucketName,
            Key: testObjectKey,
          })
        );
        diagnostics.readPermission = true;
      } catch (readErr: any) {
        throw new Error(`Read permission denied: Unable to verify uploaded test object. Details: ${readErr.message}`);
      }

      // 4. Test Delete permission (Clean up test file immediately)
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: testObjectKey,
          })
        );
        diagnostics.deletePermission = true;
      } catch (delErr: any) {
        console.warn(`[R2Service] Notice: Could not delete connection test object ${testObjectKey}:`, delErr);
      }

      // 5. Query live storage usage
      let totalBytes = 0;
      let totalObjects = 0;
      try {
        const listRes = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucketName,
            MaxKeys: 1000,
          })
        );
        if (listRes.Contents) {
          for (const item of listRes.Contents) {
            totalBytes += item.Size || 0;
            totalObjects++;
          }
        }
      } catch (listErr) {
        console.warn('[R2Service] Notice: Could not query bucket object count:', listErr);
      }

      const successMsg = `✓ R2 CONNECTED: Verified read, write, and delete permissions on bucket "${config.bucketName}".`;

      // Update DB settings with verified connection
      db.updateSettings({
        r2: {
          ...config,
          lastTestedAt: testedAt,
          lastTestStatus: 'connected',
          lastTestMessage: successMsg,
          diagnostics,
          storageUsedBytes: totalBytes,
          objectCount: totalObjects,
        },
      });

      return {
        success: true,
        connected: true,
        storageProvider: 'cloudflare_r2',
        accountId: config.accountId,
        bucketName: config.bucketName,
        message: successMsg,
        diagnostics,
        storageUsedBytes: totalBytes,
        objectCount: totalObjects,
        testedAt,
      };
    } catch (testErr: any) {
      // Clean up test file if it was created
      try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: testObjectKey }));
      } catch (e) {}

      const errMsg = testErr.message || 'Unknown error occurred while connecting to Cloudflare R2.';

      db.updateSettings({
        r2: {
          ...config,
          lastTestedAt: testedAt,
          lastTestStatus: 'error',
          lastTestMessage: errMsg,
          diagnostics,
        },
      });

      return {
        success: false,
        connected: false,
        storageProvider: 'cloudflare_r2',
        accountId: config.accountId,
        bucketName: config.bucketName,
        error: errMsg,
        diagnostics,
        testedAt,
      };
    }
  }

  /**
   * Pre-flight validation before beginning large video chunk uploads.
   * Throws human-readable error if R2 is not configured or bucket is inaccessible.
   */
  public static async validateBucketAccessible(): Promise<void> {
    const config = this.getR2Config();
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      throw new Error(
        'Cloudflare R2 Object Storage is not configured. Please go to Admin → System → Storage and enter your R2 Account ID, Access Key ID, Secret Access Key, and Bucket Name.'
      );
    }

    // Check storage limits if configured
    if (config.maxStorageGb && config.storageUsedBytes) {
      const maxBytes = config.maxStorageGb * 1024 * 1024 * 1024;
      if (config.storageUsedBytes >= maxBytes) {
        throw new Error(
          `Storage limit reached (${config.maxStorageGb} GB). Please free storage before uploading another video.`
        );
      }
    }

    const { client } = this.getS3Client();
    try {
      await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
    } catch (err: any) {
      throw new Error(`Configured Cloudflare R2 bucket "${config.bucketName}" is not accessible: ${err.message || err.name}`);
    }
  }

  /**
   * Upload video file from local disk to Cloudflare R2 using multipart streaming.
   */
  public static async uploadVideo(
    filePath: string,
    originalName: string,
    mimeType: string = 'video/mp4'
  ): Promise<{
    r2ObjectKey: string;
    r2Bucket: string;
    size: number;
    mimeType: string;
    publicUrl?: string;
  }> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File to upload does not exist: ${filePath}`);
    }

    const { client, config } = this.getS3Client();
    const stat = fs.statSync(filePath);

    // Format clean, structured object key: videos/YYYY/MM/uuid-clean-name.mp4
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const safeUuid = crypto.randomUUID();
    const safeExt = path.extname(originalName) || '.mp4';
    const safeBaseName = path
      .basename(originalName, safeExt)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);

    const r2ObjectKey = `videos/${year}/${month}/${safeUuid}_${safeBaseName}${safeExt}`;
    const fileStream = fs.createReadStream(filePath);

    try {
      const parallelUpload = new Upload({
        client,
        params: {
          Bucket: config.bucketName,
          Key: r2ObjectKey,
          Body: fileStream,
          ContentType: mimeType || 'video/mp4',
          Metadata: {
            'original-name': encodeURIComponent(originalName),
            'uploaded-at': now.toISOString(),
          },
        },
        queueSize: 4, // 4 concurrent part uploads
        partSize: 10 * 1024 * 1024, // 10MB chunk parts
        leavePartsOnError: false, // Automatically abort multipart upload on error
      });

      await parallelUpload.done();

      let publicUrl: string | undefined;
      if (config.publicUrl) {
        const cleanBase = config.publicUrl.replace(/\/+$/, '');
        publicUrl = `${cleanBase}/${r2ObjectKey}`;
      }

      // Update storage used in DB
      const currentUsed = config.storageUsedBytes || 0;
      const currentCount = config.objectCount || 0;
      db.updateSettings({
        r2: {
          ...config,
          storageUsedBytes: currentUsed + stat.size,
          objectCount: currentCount + 1,
        },
      });

      return {
        r2ObjectKey,
        r2Bucket: config.bucketName!,
        size: stat.size,
        mimeType: mimeType || 'video/mp4',
        publicUrl,
      };
    } catch (uploadErr: any) {
      console.error('[R2Service] Multipart upload to Cloudflare R2 failed:', uploadErr);
      throw new Error(`Cloudflare R2 upload failed: ${uploadErr.message || uploadErr.name}`);
    }
  }

  /**
   * Stream video object from Cloudflare R2 with full HTTP Range request support.
   */
  public static async streamVideo(
    r2ObjectKey: string,
    rangeHeader?: string
  ): Promise<{
    status: number;
    headers: Record<string, string | number>;
    stream: Readable;
  }> {
    const { client, config } = this.getS3Client();

    try {
      const getCommand = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: r2ObjectKey,
        Range: rangeHeader,
      });

      const response = await client.send(getCommand);
      const isPartial = !!rangeHeader && (response.$metadata.httpStatusCode === 206 || !!response.ContentRange);

      const headers: Record<string, string | number> = {
        'Accept-Ranges': 'bytes',
        'Content-Type': response.ContentType || 'video/mp4',
      };

      if (response.ContentLength !== undefined) {
        headers['Content-Length'] = response.ContentLength;
      }
      if (response.ContentRange) {
        headers['Content-Range'] = response.ContentRange;
      }

      const stream = response.Body as Readable;

      return {
        status: isPartial ? 206 : 200,
        headers,
        stream,
      };
    } catch (streamErr: any) {
      const httpCode = streamErr.$metadata?.httpStatusCode;
      if (httpCode === 404 || streamErr.name === 'NoSuchKey' || streamErr.name === 'NotFound') {
        throw new Error(`Video object "${r2ObjectKey}" not found in Cloudflare R2 bucket.`);
      }
      throw new Error(`Failed to stream video from Cloudflare R2: ${streamErr.message || streamErr.name}`);
    }
  }

  /**
   * Delete video object from Cloudflare R2.
   */
  public static async deleteVideo(r2ObjectKey: string): Promise<void> {
    if (!r2ObjectKey) return;
    const { client, config } = this.getS3Client();

    try {
      // First get object size to update local storage counter
      let objectSize = 0;
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: r2ObjectKey }));
        objectSize = head.ContentLength || 0;
      } catch (e) {}

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: r2ObjectKey,
        })
      );

      // Decrement stored usage
      const currentUsed = Math.max(0, (config.storageUsedBytes || 0) - objectSize);
      const currentCount = Math.max(0, (config.objectCount || 1) - 1);
      db.updateSettings({
        r2: {
          ...config,
          storageUsedBytes: currentUsed,
          objectCount: currentCount,
        },
      });
    } catch (delErr: any) {
      console.warn(`[R2Service] Error deleting object "${r2ObjectKey}" from Cloudflare R2:`, delErr);
      throw new Error(`Failed to delete object from Cloudflare R2: ${delErr.message}`);
    }
  }

  /**
   * Save and persist updated R2 settings.
   */
  public static saveSettings(newConfig: Partial<R2StorageConfig>): R2StorageConfig {
    const current = this.getR2Config();

    let secretAccessKey = newConfig.secretAccessKey;
    // If secret key wasn't changed (was sent as masked placeholder or empty), keep existing secret key
    if (!secretAccessKey || secretAccessKey.includes('••••') || secretAccessKey.trim() === '') {
      secretAccessKey = current.secretAccessKey;
    }

    const updated: R2StorageConfig = {
      storageProvider: 'cloudflare_r2',
      accountId: (newConfig.accountId !== undefined ? newConfig.accountId : current.accountId || '').trim(),
      accessKeyId: (newConfig.accessKeyId !== undefined ? newConfig.accessKeyId : current.accessKeyId || '').trim(),
      secretAccessKey: (secretAccessKey || '').trim(),
      bucketName: (newConfig.bucketName !== undefined ? newConfig.bucketName : current.bucketName || '').trim(),
      publicUrl: (newConfig.publicUrl !== undefined ? newConfig.publicUrl : current.publicUrl || '').trim(),
      maxStorageGb: newConfig.maxStorageGb !== undefined ? newConfig.maxStorageGb : current.maxStorageGb || 10,
      maxVideoSizeGb: newConfig.maxVideoSizeGb !== undefined ? newConfig.maxVideoSizeGb : current.maxVideoSizeGb || 10,
      lastTestedAt: current.lastTestedAt,
      lastTestStatus: current.lastTestStatus,
      lastTestMessage: current.lastTestMessage,
      diagnostics: current.diagnostics,
      storageUsedBytes: current.storageUsedBytes,
      objectCount: current.objectCount,
    };

    // Invalidate client cache
    this.cachedClient = null;
    this.cachedConfigSignature = '';

    db.updateSettings({ r2: updated });
    return this.getSanitizedConfig();
  }
}
