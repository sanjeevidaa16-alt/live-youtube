import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { SystemStatus } from '../../src/types.js';
import { db, UPLOAD_DIR } from '../database/db.js';
import { streamingEngine } from './streamingEngine.js';

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

function getDirectorySize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += stat.size;
      }
    }
  } catch (e) {
    // ignore
  }
  return size;
}

let cachedFfmpegInfo: { installed: boolean; version?: string } | null = null;
let cachedFfprobeInfo: { installed: boolean; version?: string } | null = null;

export class SystemService {
  public static async getFfmpegInfo(): Promise<{ installed: boolean; version?: string; path: string }> {
    if (cachedFfmpegInfo) {
      return { ...cachedFfmpegInfo, path: FFMPEG_PATH };
    }
    try {
      const { stdout } = await execFileAsync(FFMPEG_PATH, ['-version']);
      const firstLine = stdout.split('\n')[0] || '';
      const versionMatch = firstLine.match(/ffmpeg version\s+([^\s]+)/i);
      const version = versionMatch ? versionMatch[1] : firstLine;
      cachedFfmpegInfo = { installed: true, version };
      return { installed: true, version, path: FFMPEG_PATH };
    } catch (e) {
      cachedFfmpegInfo = { installed: false };
      return { installed: false, path: FFMPEG_PATH };
    }
  }

  public static async getFfprobeInfo(): Promise<{ installed: boolean; version?: string; path: string }> {
    if (cachedFfprobeInfo) {
      return { ...cachedFfprobeInfo, path: FFPROBE_PATH };
    }
    try {
      const { stdout } = await execFileAsync(FFPROBE_PATH, ['-version']);
      const firstLine = stdout.split('\n')[0] || '';
      const versionMatch = firstLine.match(/ffprobe version\s+([^\s]+)/i);
      const version = versionMatch ? versionMatch[1] : firstLine;
      cachedFfprobeInfo = { installed: true, version };
      return { installed: true, version, path: FFPROBE_PATH };
    } catch (e) {
      cachedFfprobeInfo = { installed: false };
      return { installed: false, path: FFPROBE_PATH };
    }
  }

  public static async getSystemStatus(): Promise<SystemStatus> {
    const ffmpeg = await this.getFfmpegInfo();
    const ffprobe = await this.getFfprobeInfo();

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Standard Processor';
    const cpuCores = cpus.length;

    // Estimate CPU usage based on load average
    const loadAvg = os.loadavg();
    const cpuUsagePercent = Math.min(100, Math.round((loadAvg[0] / Math.max(1, cpuCores)) * 100));

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const totalMb = Math.round(totalMem / (1024 * 1024));
    const usedMb = Math.round(usedMem / (1024 * 1024));
    const freeMb = Math.round(freeMem / (1024 * 1024));
    const usagePercent = Math.round((usedMem / totalMem) * 100);

    const uploadDirBytes = getDirectorySize(UPLOAD_DIR);
    const uploadDirSizeMb = Math.round((uploadDirBytes / (1024 * 1024)) * 10) / 10;

    const streamStatus = streamingEngine.getStatus();
    const videosCount = db.getVideos().length;

    return {
      ffmpegInstalled: ffmpeg.installed,
      ffmpegVersion: ffmpeg.version,
      ffmpegPath: ffmpeg.path,
      ffprobeInstalled: ffprobe.installed,
      ffprobeVersion: ffprobe.version,
      ffprobePath: ffprobe.path,
      streamingEngineReady: ffmpeg.installed && ffprobe.installed,
      cpuUsagePercent,
      cpuModel,
      cpuCores,
      memory: {
        totalMb,
        usedMb,
        freeMb,
        usagePercent,
      },
      disk: {
        uploadDirSizeMb,
      },
      nodeUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      activeStreamRunning: streamStatus.active,
      totalVideosCount: videosCount,
    };
  }
}
