import { SupabaseService } from './supabaseService.js';
import { StorageTestResult } from '../../src/types.js';
import fs from 'fs';
import path from 'path';

export class SupabaseStorageService {
  public static isConfigured(): boolean {
    return SupabaseService.isConfigured();
  }

  public static async ensureBucketExists(bucketName: string = 'videos'): Promise<boolean> {
    const client = SupabaseService.getClient();
    if (!client) return false;

    try {
      const { data: buckets, error } = await client.storage.listBuckets();
      if (error) {
        console.warn('[SupabaseStorage] Error listing buckets:', error.message);
        return false;
      }

      const exists = buckets?.some((b) => b.name === bucketName);
      if (exists) {
        return true;
      }

      // Attempt to create bucket if service role key is available
      const { error: createErr } = await client.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5368709120, // 5GB
      });

      if (createErr) {
        console.warn(`[SupabaseStorage] Notice: Could not create bucket '${bucketName}':`, createErr.message);
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn('[SupabaseStorage] ensureBucketExists exception:', err.message);
      return false;
    }
  }

  public static async uploadVideo(
    localFilePath: string,
    objectPath: string,
    contentType: string = 'video/mp4',
    bucketName: string = 'videos'
  ): Promise<{ objectPath: string; bucket: string }> {
    const client = SupabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Local file not found for upload: ${localFilePath}`);
    }

    await this.ensureBucketExists(bucketName);

    const fileBuffer = fs.readFileSync(localFilePath);

    const { data, error } = await client.storage.from(bucketName).upload(objectPath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return {
      objectPath: data.path || objectPath,
      bucket: bucketName,
    };
  }

  public static async downloadVideo(
    objectPath: string,
    localDestPath: string,
    bucketName: string = 'videos'
  ): Promise<void> {
    const client = SupabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await client.storage.from(bucketName).download(objectPath);
    if (error || !data) {
      throw new Error(`Failed to download video from Supabase Storage: ${error?.message || 'Unknown error'}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localDestPath, buffer);
  }

  public static async getSignedUrl(objectPath: string, expiresIn: number = 3600, bucketName: string = 'videos'): Promise<string> {
    const client = SupabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await client.storage.from(bucketName).createSignedUrl(objectPath, expiresIn);
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  public static async deleteVideo(objectPath: string, bucketName: string = 'videos'): Promise<boolean> {
    const client = SupabaseService.getClient();
    if (!client) return false;

    try {
      const { error } = await client.storage.from(bucketName).remove([objectPath]);
      if (error) {
        console.warn('[SupabaseStorage] Delete error:', error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.warn('[SupabaseStorage] Delete exception:', e.message);
      return false;
    }
  }

  public static async testConnection(): Promise<StorageTestResult> {
    const testedAt = new Date().toISOString();
    const client = SupabaseService.getClient();

    if (!client || !SupabaseService.isConfigured()) {
      return {
        success: false,
        connected: false,
        bucketFound: false,
        writeTestPassed: false,
        readTestPassed: false,
        deleteTestPassed: false,
        message: 'Supabase credentials are not configured.',
        error: 'SUPABASE_NOT_CONFIGURED',
        testedAt,
      };
    }

    const bucketName = 'videos';
    const testObjectPath = '.system/storage-connection-test.txt';
    const testContent = `CastLoop Supabase Storage Connection Test - ${testedAt}`;

    let bucketFound = false;
    let writeTestPassed = false;
    let readTestPassed = false;
    let deleteTestPassed = false;

    try {
      // 1. Check or create bucket
      bucketFound = await this.ensureBucketExists(bucketName);
      if (!bucketFound) {
        // Try listing buckets directly
        const { data: buckets, error: listErr } = await client.storage.listBuckets();
        if (listErr) {
          throw new Error(`Storage listBuckets failed: ${listErr.message}`);
        }
        bucketFound = !!buckets?.some((b) => b.name === bucketName);
        if (!bucketFound) {
          throw new Error(`Supabase Storage bucket '${bucketName}' does not exist and could not be created automatically.`);
        }
      }

      // 2. Write test file
      const { error: uploadErr } = await client.storage.from(bucketName).upload(testObjectPath, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

      if (uploadErr) {
        throw new Error(`Write test failed: ${uploadErr.message}`);
      }
      writeTestPassed = true;

      // 3. Read test file
      const { data: downloadData, error: downloadErr } = await client.storage.from(bucketName).download(testObjectPath);
      if (downloadErr || !downloadData) {
        throw new Error(`Read test failed: ${downloadErr?.message || 'No data returned'}`);
      }
      const text = await downloadData.text();
      if (!text.includes('CastLoop')) {
        throw new Error('Read test verification failed: content mismatch.');
      }
      readTestPassed = true;

      // 4. Delete test file
      const { error: deleteErr } = await client.storage.from(bucketName).remove([testObjectPath]);
      if (deleteErr) {
        throw new Error(`Delete test failed: ${deleteErr.message}`);
      }
      deleteTestPassed = true;

      return {
        success: true,
        connected: true,
        bucketFound,
        writeTestPassed,
        readTestPassed,
        deleteTestPassed,
        message: '✓ SUPABASE STORAGE CONNECTED: Bucket found, write, read, and delete tests passed successfully.',
        testedAt,
      };
    } catch (err: any) {
      console.error('[SupabaseStorage] Connection test failed:', err);
      // Attempt cleanup of test file if write passed
      try {
        if (writeTestPassed) {
          await client.storage.from(bucketName).remove([testObjectPath]);
        }
      } catch (e) {}

      return {
        success: false,
        connected: false,
        bucketFound,
        writeTestPassed,
        readTestPassed,
        deleteTestPassed,
        message: `Storage test failed: ${err.message}`,
        error: err.message,
        testedAt,
      };
    }
  }

  public static async getHealth() {
    const isConfigured = SupabaseService.isConfigured();
    let bucketConfigured = false;

    if (isConfigured) {
      bucketConfigured = await this.ensureBucketExists('videos');
    }

    return {
      supabaseConfigured: isConfigured,
      storageConfigured: isConfigured,
      bucketConfigured,
      bucket: 'videos',
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    };
  }
}
