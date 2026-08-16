import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { db, UPLOAD_DIR, THUMBNAIL_DIR } from '../database/db.js';
import { VideoItem } from '../../src/types.js';
import { SupabaseService } from './supabaseService.js';

const execFileAsync = promisify(execFile);

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
  audioCodec?: string;
  bitrate?: number;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export class VideoService {
  public static async probeVideo(filePath: string): Promise<VideoMetadata> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file does not exist at path: ${filePath}`);
    }

    try {
      const { stdout } = await execFileAsync(FFPROBE_PATH, [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      const probeData = JSON.parse(stdout);
      const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = probeData.streams?.find((s: any) => s.codec_type === 'audio');

      if (!videoStream) {
        throw new Error('No valid video stream found in the uploaded file.');
      }

      let duration = parseFloat(probeData.format?.duration || videoStream?.duration || '0');
      if (isNaN(duration) || duration <= 0) {
        duration = 0;
      }

      let width = parseInt(videoStream?.width || '0', 10);
      let height = parseInt(videoStream?.height || '0', 10);
      if (isNaN(width) || width <= 0) width = 1920;
      if (isNaN(height) || height <= 0) height = 1080;

      // Parse fps
      let fps = 30;
      if (videoStream?.r_frame_rate && videoStream.r_frame_rate !== '0/0') {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2 && parseFloat(parts[1]) > 0) {
          fps = Math.round(parseFloat(parts[0]) / parseFloat(parts[1]));
        } else {
          fps = Math.round(parseFloat(parts[0]) || 30);
        }
      } else if (videoStream?.avg_frame_rate && videoStream.avg_frame_rate !== '0/0') {
        const parts = videoStream.avg_frame_rate.split('/');
        if (parts.length === 2 && parseFloat(parts[1]) > 0) {
          fps = Math.round(parseFloat(parts[0]) / parseFloat(parts[1]));
        }
      }

      const codec = videoStream?.codec_name || 'h264';
      const hasAudio = !!audioStream;
      const audioCodec = audioStream?.codec_name;
      const bitrate = parseInt(probeData.format?.bit_rate || videoStream?.bit_rate || '0', 10) || undefined;

      return {
        duration,
        width,
        height,
        fps: isNaN(fps) || fps <= 0 ? 30 : fps,
        codec,
        hasAudio,
        audioCodec,
        bitrate,
      };
    } catch (err: any) {
      console.warn(`[VideoService] FFprobe notice for ${filePath}: ${err.message}. Using safe fallback metadata.`);
      return {
        duration: 0,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        hasAudio: true,
      };
    }
  }

  public static async generateThumbnail(filePath: string, videoId: string, duration: number): Promise<string | null> {
    const thumbFilename = `${videoId}.jpg`;
    const outputPath = path.join(THUMBNAIL_DIR, thumbFilename);
    const seekTime = duration > 2 ? '00:00:01' : '00:00:00';

    try {
      await execFileAsync(FFMPEG_PATH, [
        '-y',
        '-ss',
        seekTime,
        '-i',
        filePath,
        '-vframes',
        '1',
        '-vf',
        'scale=480:-1',
        '-q:v',
        '2',
        outputPath,
      ]);

      if (fs.existsSync(outputPath)) {
        return `/uploads/thumbnails/${thumbFilename}`;
      }
    } catch (err) {
      console.warn(`[VideoService] Thumbnail generation failed for ${filePath}:`, err);
    }

    return null;
  }

  public static async processNewUpload(
    originalName: string,
    storedFilename: string,
    tempFilePath: string,
    fileSize: number,
    r2ObjectKey?: string,
    r2Bucket?: string
  ): Promise<VideoItem> {
    const videoId = path.parse(storedFilename).name;
    const metadata = await this.probeVideo(tempFilePath);
    const thumbnailUrl = (await this.generateThumbnail(tempFilePath, videoId, metadata.duration)) || '';

    const resolution = metadata.width > 0 && metadata.height > 0 ? `${metadata.width}x${metadata.height}` : '1080p';

    const videoItem: VideoItem = {
      id: videoId,
      originalName,
      storedName: storedFilename,
      filename: storedFilename,
      path: tempFilePath, // In Cloudflare R2 mode, permanent video is in R2
      thumbnailUrl,
      size: fileSize,
      duration: metadata.duration,
      durationFormatted: formatDuration(metadata.duration),
      width: metadata.width,
      height: metadata.height,
      resolution,
      fps: metadata.fps,
      codec: metadata.codec,
      audioCodec: metadata.audioCodec,
      hasAudio: metadata.hasAudio,
      bitrate: metadata.bitrate,
      source: r2ObjectKey ? 'r2' : 'upload',
      r2ObjectKey,
      r2Bucket,
      storageProvider: r2ObjectKey ? 'cloudflare_r2' : 'vps',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Persist in local DB cache
    db.addVideo(videoItem);

    // Persist metadata in Supabase PostgreSQL database if configured
    if (SupabaseService.isConfigured()) {
      try {
        await SupabaseService.insertVideo(videoItem);
        await SupabaseService.logEvent(undefined, 'UPLOAD', `Video "${originalName}" uploaded to Cloudflare R2 and registered in Supabase.`);
      } catch (sbErr: any) {
        console.warn('[VideoService] Supabase insert warning:', sbErr.message);
      }
    }

    return videoItem;
  }

  public static getVideoFile(id: string): { video: VideoItem; filePath: string } | null {
    const video = db.getVideoById(id);
    if (!video) return null;
    if (!fs.existsSync(video.path)) return null;
    return { video, filePath: video.path };
  }
}
