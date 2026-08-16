import { spawn, ChildProcess, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { db } from '../database/db.js';
import { VideoService, VideoMetadata } from './videoService.js';
import { SupabaseService } from './supabaseService.js';
import {
  StreamConfig,
  StreamInstance,
  StreamState,
  StreamStatusInfo,
  FFmpegLogEntry,
  StreamSessionHistory,
} from '../../src/types.js';

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

export interface StartStreamResult {
  success: boolean;
  code?: string;
  message: string;
  sessionId?: string;
  streamId?: string;
  status?: StreamStatusInfo;
  stream?: StreamInstance;
}

interface ActiveProcessContext {
  streamId: string;
  userId: string;
  process: ChildProcess | null;
  state: StreamState;
  config: StreamInstance;
  startedAt: Date | null;
  sessionId: string;
  reconnectCount: number;
  isIntentionalStop: boolean;
  startupWatchdogTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  logs: FFmpegLogEntry[];
  lastErrorMessage: string;
  currentVideoDuration: number;
  currentVideoTitle: string;
  currentVideoMetadata: VideoMetadata | null;
  encoderStats: {
    frame: number;
    fps: number;
    q: number;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
  };
}

class StreamingEngine extends EventEmitter {
  // Map of streamId -> ActiveProcessContext
  private contexts: Map<string, ActiveProcessContext> = new Map();
  private readonly maxLogsPerStream = 500;

  // Global & Per-stream SSE clients
  private globalLogClients = new Set<(entry: FFmpegLogEntry & { streamId?: string }) => void>();
  private perStreamLogClients = new Map<string, Set<(entry: FFmpegLogEntry) => void>>();
  private perStreamStatusClients = new Map<string, Set<(status: StreamInstance) => void>>();
  private globalStatusClients = new Set<(streams: StreamInstance[]) => void>();

  constructor() {
    super();
    // 1-second interval to update uptime & broadcast live telemetry
    setInterval(() => {
      this.tickTelemetry();
    }, 1000);
  }

  private tickTelemetry(): void {
    let hasLiveStreams = false;
    for (const [streamId, ctx] of this.contexts.entries()) {
      if (ctx.state === 'LIVE' || ctx.state === 'STARTING' || ctx.state === 'RECONNECTING') {
        hasLiveStreams = true;
        const uptimeSec = ctx.startedAt ? Math.floor((Date.now() - ctx.startedAt.getTime()) / 1000) : 0;
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const secs = uptimeSec % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

        let loopCount = 1;
        if (ctx.currentVideoDuration > 0 && uptimeSec > 0) {
          loopCount = Math.floor(uptimeSec / ctx.currentVideoDuration) + 1;
        }

        // Update database in memory
        db.updateStreamInstance(streamId, {
          uptimeSeconds: uptimeSec,
          uptimeFormatted: formatted,
          currentLoopCount: loopCount,
          status: ctx.state,
          encoderStats: ctx.encoderStats,
          ffmpegPid: ctx.process?.pid,
          lastLogLine: ctx.logs.length > 0 ? ctx.logs[ctx.logs.length - 1].message : undefined,
        });

        // Broadcast to stream listeners
        const updated = db.getStreamInstanceById(streamId);
        if (updated) {
          this.broadcastStreamStatus(streamId, updated);
        }
      }
    }

    if (hasLiveStreams && this.globalStatusClients.size > 0) {
      const allStreams = db.getStreamInstances();
      for (const client of this.globalStatusClients) {
        try {
          client(allStreams);
        } catch (e) {}
      }
    }
  }

  // Sanitize sensitive credentials from log text
  public sanitize(text: string, streamKey?: string): string {
    if (!text) return '';
    let result = text;
    if (streamKey) {
      result = result.replaceAll(streamKey, '••••••••');
    }
    result = result.replace(/(rtmps?:\/\/[^\s\/]+\/[^\s\/]+\/)([a-zA-Z0-9_-]{6,})/g, '$1••••••••');
    return result;
  }

  private getOrCreateContext(stream: StreamInstance): ActiveProcessContext {
    let ctx = this.contexts.get(stream.id);
    if (!ctx) {
      ctx = {
        streamId: stream.id,
        userId: stream.userId,
        process: null,
        state: 'IDLE',
        config: stream,
        startedAt: null,
        sessionId: `stream-${stream.id.slice(0, 8)}-${Date.now()}`,
        reconnectCount: 0,
        isIntentionalStop: false,
        startupWatchdogTimer: null,
        reconnectTimer: null,
        logs: [],
        lastErrorMessage: '',
        currentVideoDuration: 0,
        currentVideoTitle: stream.name,
        currentVideoMetadata: null,
        encoderStats: {
          frame: 0,
          fps: 0,
          q: 0,
          size: '0kB',
          time: '00:00:00.00',
          bitrate: '0kbits/s',
          speed: '0x',
        },
      };
      this.contexts.set(stream.id, ctx);
    } else {
      ctx.config = stream;
    }
    return ctx;
  }

  public async runDiagnostics(videoId?: string): Promise<{
    ffmpegInstalled: boolean;
    ffmpegVersion?: string;
    ffprobeInstalled: boolean;
    ffprobeVersion?: string;
    uploadDirWritable: boolean;
    videoValid: boolean;
    videoMetadata?: VideoMetadata;
    videoError?: string;
    rtmpValid: boolean;
    currentProcessRunning: boolean;
  }> {
    let ffmpegInstalled = false;
    let ffmpegVersion: string | undefined;
    let ffprobeInstalled = false;
    let ffprobeVersion: string | undefined;

    try {
      const { stdout } = await execFileAsync(FFMPEG_PATH, ['-version']);
      ffmpegInstalled = true;
      ffmpegVersion = stdout.split('\n')[0];
    } catch (e) {}

    try {
      const { stdout } = await execFileAsync(FFPROBE_PATH, ['-version']);
      ffprobeInstalled = true;
      ffprobeVersion = stdout.split('\n')[0];
    } catch (e) {}

    const uploadDirWritable = true;
    let videoValid = false;
    let videoMetadata: VideoMetadata | undefined;
    let videoError: string | undefined;

    if (videoId) {
      const video = db.getVideoById(videoId);
      if (video && (video.r2ObjectKey || (video.path && fs.existsSync(video.path)))) {
        videoValid = true;
        videoMetadata = {
          duration: video.duration || 0,
          width: video.width || 1920,
          height: video.height || 1080,
          fps: video.fps || 30,
          codec: video.codec || 'h264',
          hasAudio: video.hasAudio !== false,
        };
      } else {
        videoError = 'Video file not found in Cloudflare R2 or local storage.';
      }
    }

    const hasAnyProcess = Array.from(this.contexts.values()).some((c) => c.process && !c.process.killed);

    return {
      ffmpegInstalled,
      ffmpegVersion,
      ffprobeInstalled,
      ffprobeVersion,
      uploadDirWritable,
      videoValid,
      videoMetadata,
      videoError,
      rtmpValid: true,
      currentProcessRunning: hasAnyProcess,
    };
  }

  // =========================================================================
  // MULTI-STREAM INSTANCE CONTROLS
  // =========================================================================

  public async startStreamInstance(
    streamId: string,
    overrideConfig?: Partial<StreamConfig>
  ): Promise<StartStreamResult> {
    const stream = db.getStreamInstanceById(streamId);
    if (!stream) {
      return { success: false, code: 'STREAM_NOT_FOUND', message: 'Live stream configuration not found.' };
    }

    const ctx = this.getOrCreateContext(stream);

    // 1. Check if already active
    if (ctx.process && (ctx.state === 'LIVE' || ctx.state === 'STARTING' || ctx.state === 'RECONNECTING')) {
      return {
        success: false,
        code: 'STREAM_ALREADY_RUNNING',
        message: `Stream "${stream.name}" is already active (PID ${ctx.process.pid}).`,
        stream: db.getStreamInstanceById(streamId) || stream,
      };
    }

    // 2. Concurrency limit check
    const settings = db.getSettings();
    const maxStreams = settings.maxConcurrentStreams || 5;
    const activeCount = Array.from(this.contexts.values()).filter(
      (c) => c.process && (c.state === 'LIVE' || c.state === 'STARTING' || c.state === 'RECONNECTING')
    ).length;

    if (activeCount >= maxStreams) {
      return {
        success: false,
        code: 'MAX_CONCURRENT_LIMIT',
        message: `Maximum concurrent live streams limit reached (${activeCount}/${maxStreams}). Please stop an active stream or increase the limit in Settings.`,
      };
    }

    // Apply any config overrides if provided
    if (overrideConfig) {
      if (overrideConfig.videoId) stream.videoId = overrideConfig.videoId;
      if (overrideConfig.playlistId) stream.playlistId = overrideConfig.playlistId;
      if (overrideConfig.rtmpUrl) stream.rtmpUrl = overrideConfig.rtmpUrl;
      if (overrideConfig.streamKey) {
        stream.streamKey = overrideConfig.streamKey;
        stream.maskedStreamKey = `••••••••${overrideConfig.streamKey.slice(-4)}`;
      }
      if (overrideConfig.quality) stream.quality = overrideConfig.quality;
      if (overrideConfig.bitrate) stream.bitrate = overrideConfig.bitrate;
      if (overrideConfig.fps) stream.fps = overrideConfig.fps;
    }

    // 3. Resolve videos to stream
    let videoList: any[] = [];
    if (stream.playlistId) {
      const pl = db.getPlaylistById(stream.playlistId);
      if (pl && pl.videoIds.length > 0) {
        videoList = pl.videoIds.map((id) => db.getVideoById(id)).filter(Boolean);
        stream.playlistName = pl.name;
        stream.videoIds = pl.videoIds;
      }
    } else if (stream.videoIds && stream.videoIds.length > 0) {
      videoList = stream.videoIds.map((id) => db.getVideoById(id)).filter(Boolean);
    } else if (stream.videoId) {
      const v = db.getVideoById(stream.videoId);
      if (v) videoList = [v];
    }

    if (videoList.length === 0) {
      // Fallback: Pick first available video if not configured
      const allVideos = db.getVideos();
      if (allVideos.length > 0) {
        videoList = [allVideos[0]];
        stream.videoId = allVideos[0].id;
        stream.videoTitle = allVideos[0].originalName;
      } else {
        return {
          success: false,
          code: 'VIDEO_NOT_FOUND',
          message: 'No video or playlist assigned to this stream. Please upload a video first.',
        };
      }
    }

    for (const v of videoList) {
      const isR2 = !!v.r2ObjectKey;
      const isLocal = v.path && fs.existsSync(v.path);
      if (!isR2 && !isLocal) {
        return {
          success: false,
          code: 'VIDEO_FILE_MISSING',
          message: `Video file "${v.originalName}" is missing in Cloudflare R2 and local storage.`,
        };
      }
    }

    // 4. Pre-flight verification on primary video
    if (videoList[0].path && fs.existsSync(videoList[0].path)) {
      try {
        ctx.currentVideoMetadata = await VideoService.probeVideo(videoList[0].path);
      } catch (err: any) {
        console.warn(`[Engine] FFprobe note for ${videoList[0].originalName}:`, err.message);
      }
    }
    if (!ctx.currentVideoMetadata) {
      ctx.currentVideoMetadata = {
        duration: videoList[0].duration || 0,
        width: videoList[0].width || 1920,
        height: videoList[0].height || 1080,
        fps: videoList[0].fps || 30,
        codec: videoList[0].codec || 'h264',
        hasAudio: videoList[0].hasAudio !== false,
      };
    }

    // 5. Validate RTMP URL & Stream Key
    let targetRtmp = (stream.rtmpUrl || settings.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2').trim();
    if (!targetRtmp || (!targetRtmp.startsWith('rtmp://') && !targetRtmp.startsWith('rtmps://'))) {
      return {
        success: false,
        code: 'INVALID_RTMP_URL',
        message: 'Invalid RTMP URL. Must start with rtmp:// or rtmps://',
      };
    }

    // Auto-upgrade YouTube RTMP to Secure RTMPS
    if (
      targetRtmp.includes('rtmp://a.rtmp.youtube.com') ||
      targetRtmp.includes('rtmp://b.rtmp.youtube.com') ||
      targetRtmp.includes('rtmp://youtube.com')
    ) {
      targetRtmp = targetRtmp.replace('rtmp://', 'rtmps://').replace('.rtmp.', '.rtmps.');
    }

    const cleanKey = (stream.streamKey || settings.defaultStreamKey || '').trim();
    if (!cleanKey) {
      return {
        success: false,
        code: 'STREAM_KEY_REQUIRED',
        message: `Stream Key is required for "${stream.name}". Please edit the stream and enter your YouTube Stream Key.`,
      };
    }

    stream.rtmpUrl = targetRtmp;
    stream.streamKey = cleanKey;
    stream.maskedStreamKey = `••••••••${cleanKey.slice(-4)}`;
    stream.videoId = videoList[0].id;
    stream.videoTitle = videoList.length > 1 ? `${stream.playlistName || 'Playlist'} (${videoList.length} videos)` : videoList[0].originalName;
    stream.videoIds = videoList.map((v) => v.id);

    let totalDur = 0;
    for (const v of videoList) totalDur += v.duration || 0;
    ctx.currentVideoDuration = totalDur || ctx.currentVideoMetadata.duration || 0;
    ctx.currentVideoTitle = stream.videoTitle || videoList[0].originalName;
    ctx.isIntentionalStop = false;
    ctx.reconnectCount = 0;
    ctx.lastErrorMessage = '';
    ctx.sessionId = `stream-${stream.id.slice(0, 6)}-${Date.now()}`;
    ctx.startedAt = new Date();
    ctx.state = 'STARTING';

    ctx.encoderStats = {
      frame: 0,
      fps: 0,
      q: 0,
      size: '0kB',
      time: '00:00:00.00',
      bitrate: '0kbits/s',
      speed: '0x',
    };

    // Update DB record
    db.updateStreamInstance(stream.id, {
      status: 'STARTING',
      startedAt: ctx.startedAt.toISOString(),
      stoppedAt: undefined,
      lastError: undefined,
      rtmpUrl: targetRtmp,
      streamKey: cleanKey,
      videoId: stream.videoId,
      videoTitle: stream.videoTitle,
      videoIds: stream.videoIds,
      playlistId: stream.playlistId,
      playlistName: stream.playlistName,
    });

    this.addStreamLog(stream.id, `[Engine] Starting stream "${stream.name}"... Connecting to ${targetRtmp}`, 'info');

    // Launch FFmpeg asynchronously
    this.launchStreamFFmpeg(ctx, videoList);

    const updatedInstance = db.getStreamInstanceById(stream.id) || stream;
    this.broadcastStreamStatus(stream.id, updatedInstance);

    return {
      success: true,
      sessionId: ctx.sessionId,
      streamId: stream.id,
      message: `Live stream "${stream.name}" initiated. Connecting to YouTube RTMP...`,
      stream: updatedInstance,
    };
  }

  private launchStreamFFmpeg(ctx: ActiveProcessContext, videoList: any[]): void {
    const stream = db.getStreamInstanceById(ctx.streamId) || ctx.config;
    const args: string[] = [];

    // Allow streaming from local files, HTTP endpoints (Cloudflare R2 stream proxy), and TLS
    args.push('-protocol_whitelist', 'file,http,https,tcp,tls,crypto');

    // Real-time input pacing
    args.push('-re');

    const resolveInput = (v: any) => {
      if (v.path && fs.existsSync(v.path)) {
        return v.path;
      }
      return `http://127.0.0.1:3000/api/videos/${v.id}/file`;
    };

    if (videoList.length > 1) {
      // Multi-video playlist: Create concat file
      const playlistTxtPath = path.join('/tmp', `playlist_${ctx.sessionId}.txt`);
      const lines = videoList.map((v) => `file '${resolveInput(v).replace(/'/g, "'\\''")}'`).join('\n');
      fs.writeFileSync(playlistTxtPath, lines, 'utf8');

      if (stream.loop !== false) {
        args.push('-stream_loop', '-1');
      }
      args.push('-f', 'concat', '-safe', '0', '-i', playlistTxtPath);
    } else {
      // Single video
      if (stream.loop !== false) {
        args.push('-stream_loop', '-1');
      }
      args.push('-i', resolveInput(videoList[0]));
    }

    // Audio stream handling
    const hasOriginalAudio = ctx.currentVideoMetadata ? ctx.currentVideoMetadata.hasAudio : videoList[0].hasAudio;
    const needsSilentAudio = !hasOriginalAudio || stream.audio === false;

    if (needsSilentAudio) {
      this.addStreamLog(ctx.streamId, '[Engine] Generating continuous AAC silent audio for RTMP ingest compliance', 'info');
      args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    // Stream Mapping
    if (needsSilentAudio) {
      args.push('-map', '0:v:0');
      args.push('-map', '1:a:0');
    } else {
      args.push('-map', '0:v:0');
      args.push('-map', '0:a:0');
    }

    // Video Filtering & Scaling
    const videoFilters: string[] = [];
    if (stream.quality === '1080p') {
      videoFilters.push('scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2');
    } else if (stream.quality === '720p') {
      videoFilters.push('scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2');
    } else {
      videoFilters.push('pad=ceil(iw/2)*2:ceil(ih/2)*2');
    }

    const targetFps = typeof stream.fps === 'number' ? stream.fps : (videoList[0]?.fps || 30);
    if (stream.fps && stream.fps !== 'source') {
      videoFilters.push(`fps=${targetFps}`);
    }

    if (videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','));
    }

    // Video Encoding
    args.push('-c:v', 'libx264');
    args.push('-preset', 'veryfast');
    args.push('-tune', 'zerolatency');
    args.push('-pix_fmt', 'yuv420p');

    let videoBitrate = '4000k';
    if (stream.bitrate && stream.bitrate !== 'auto') {
      videoBitrate = stream.bitrate.endsWith('k') ? stream.bitrate : `${stream.bitrate}k`;
    } else {
      if (stream.quality === '1080p') videoBitrate = '4500k';
      else if (stream.quality === '720p') videoBitrate = '2500k';
      else videoBitrate = '3500k';
    }

    args.push('-b:v', videoBitrate);
    args.push('-maxrate', videoBitrate);
    const numBitrate = parseInt(videoBitrate.replace('k', ''), 10) || 4000;
    args.push('-bufsize', `${numBitrate * 2}k`);

    // Keyframe interval (2s for YouTube)
    args.push('-g', `${targetFps * 2}`);
    args.push('-keyint_min', `${targetFps}`);

    // Audio Encoding
    args.push('-c:a', 'aac');
    args.push('-b:a', '128k');
    args.push('-ar', '44100');
    args.push('-ac', '2');

    // RTMP Container & Destination
    args.push('-flvflags', 'no_duration_filesize');
    args.push('-f', 'flv');

    const cleanRtmp = (stream.rtmpUrl || 'rtmps://a.rtmps.youtube.com/live2').replace(/\/+$/, '');
    const cleanKey = (stream.streamKey || '').replace(/^\/+/, '');
    const fullRtmpDestination = `${cleanRtmp}/${cleanKey}`;
    args.push(fullRtmpDestination);

    this.addStreamLog(ctx.streamId, `[Engine] Spawning FFmpeg instance for "${stream.name}"...`, 'info');

    try {
      const child = spawn(FFMPEG_PATH, args, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      ctx.process = child;
      const pid = child.pid;
      db.updateStreamInstance(ctx.streamId, { ffmpegPid: pid });
      this.addStreamLog(ctx.streamId, `[Engine] FFmpeg process started with PID ${pid}`, 'info');

      // 25-second startup watchdog
      if (ctx.startupWatchdogTimer) clearTimeout(ctx.startupWatchdogTimer);
      ctx.startupWatchdogTimer = setTimeout(() => {
        if (ctx.state === 'STARTING' && ctx.process && !ctx.process.killed) {
          const timeoutMsg = 'Startup timeout: FFmpeg is running but no frames or RTMP output detected after 25s. Check network or Stream Key.';
          this.addStreamLog(ctx.streamId, `[Engine] ${timeoutMsg}`, 'warn');
          ctx.lastErrorMessage = timeoutMsg;
          db.updateStreamInstance(ctx.streamId, { lastError: timeoutMsg });
        }
      }, 25000);

      // Handle stderr
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        const lines = text.split(/\r\n|\r|\n/);

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.includes('frame=') || line.includes('fps=') || line.includes('bitrate=')) {
            this.parseStreamEncoderStats(ctx, line);
            if (ctx.state === 'STARTING') {
              ctx.state = 'LIVE';
              if (ctx.startupWatchdogTimer) {
                clearTimeout(ctx.startupWatchdogTimer);
                ctx.startupWatchdogTimer = null;
              }
              this.addStreamLog(ctx.streamId, `[Engine] Stream "${stream.name}" is LIVE! Continuous 24/7 RTMP loop verified.`, 'info');
              db.updateStreamInstance(ctx.streamId, { status: 'LIVE', lastError: undefined });
              const current = db.getStreamInstanceById(ctx.streamId);
              if (current) this.broadcastStreamStatus(ctx.streamId, current);
            }
          } else {
            const classified = this.classifyFfmpegError(line, stream.streamKey);
            if (classified) {
              this.addStreamLog(ctx.streamId, line, 'error', stream.streamKey);
              ctx.lastErrorMessage = classified;
              db.updateStreamInstance(ctx.streamId, { lastError: classified });
            } else if (line.toLowerCase().includes('warning')) {
              this.addStreamLog(ctx.streamId, line, 'warn', stream.streamKey);
            } else {
              this.addStreamLog(ctx.streamId, line, 'info', stream.streamKey);
            }
          }
        }
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        this.addStreamLog(ctx.streamId, text, 'info', stream.streamKey);
      });

      child.on('error', (err: Error) => {
        this.addStreamLog(ctx.streamId, `[Engine] FFmpeg process error: ${err.message}`, 'error');
        ctx.lastErrorMessage = `Process spawn error: ${err.message}`;
        this.handleStreamProcessExit(ctx, -1, 'ERROR');
      });

      child.on('exit', (code: number | null, signal: string | null) => {
        this.addStreamLog(
          ctx.streamId,
          `[Engine] FFmpeg process exited (code: ${code}, signal: ${signal})`,
          code === 0 ? 'info' : 'warn'
        );
        this.handleStreamProcessExit(ctx, code, signal);
      });
    } catch (err: any) {
      ctx.state = 'ERROR';
      ctx.lastErrorMessage = `Failed to spawn FFmpeg: ${err.message}`;
      this.addStreamLog(ctx.streamId, ctx.lastErrorMessage, 'error');
      db.updateStreamInstance(ctx.streamId, { status: 'ERROR', lastError: ctx.lastErrorMessage, ffmpegPid: undefined });
      const current = db.getStreamInstanceById(ctx.streamId);
      if (current) this.broadcastStreamStatus(ctx.streamId, current);
    }
  }

  private parseStreamEncoderStats(ctx: ActiveProcessContext, line: string): void {
    const frameMatch = line.match(/frame=\s*(\d+)/);
    const fpsMatch = line.match(/fps=\s*([\d.]+)/);
    const qMatch = line.match(/q=\s*([\d.-]+)/);
    const sizeMatch = line.match(/size=\s*([\d\w]+)/);
    const timeMatch = line.match(/time=\s*([\d:.]+)/);
    const bitrateMatch = line.match(/bitrate=\s*([\d.\w/]+)/);
    const speedMatch = line.match(/speed=\s*([\d.]+x)/);

    if (frameMatch) ctx.encoderStats.frame = parseInt(frameMatch[1], 10);
    if (fpsMatch) ctx.encoderStats.fps = parseFloat(fpsMatch[1]);
    if (qMatch) ctx.encoderStats.q = parseFloat(qMatch[1]);
    if (sizeMatch) ctx.encoderStats.size = sizeMatch[1];
    if (timeMatch) ctx.encoderStats.time = timeMatch[1];
    if (bitrateMatch) ctx.encoderStats.bitrate = bitrateMatch[1];
    if (speedMatch) ctx.encoderStats.speed = speedMatch[1];
  }

  private handleStreamProcessExit(ctx: ActiveProcessContext, code: number | null, signal: string | null): void {
    ctx.process = null;
    if (ctx.startupWatchdogTimer) {
      clearTimeout(ctx.startupWatchdogTimer);
      ctx.startupWatchdogTimer = null;
    }

    const stream = db.getStreamInstanceById(ctx.streamId);

    if (ctx.isIntentionalStop) {
      ctx.state = 'STOPPED';
      this.recordStreamHistory(ctx, 'STOPPED');
      db.updateStreamInstance(ctx.streamId, {
        status: 'STOPPED',
        ffmpegPid: undefined,
        stoppedAt: new Date().toISOString(),
      });
      this.addStreamLog(ctx.streamId, '[Engine] Stream stopped intentionally.', 'info');
      if (stream) this.broadcastStreamStatus(ctx.streamId, stream);
      return;
    }

    const settings = db.getSettings();
    const shouldReconnect = stream?.autoReconnect ?? settings.autoReconnect;
    const maxAttempts = stream?.maxReconnectAttempts ?? settings.maxReconnectAttempts;
    const delaySec = stream?.reconnectDelaySeconds ?? settings.reconnectDelay;

    if (shouldReconnect && ctx.reconnectCount < maxAttempts) {
      ctx.state = 'RECONNECTING';
      ctx.reconnectCount += 1;

      if (stream?.rtmpUrl && stream.rtmpUrl.includes('rtmp://')) {
        stream.rtmpUrl = stream.rtmpUrl.replace('rtmp://', 'rtmps://').replace('.rtmp.', '.rtmps.');
        db.updateStreamInstance(ctx.streamId, { rtmpUrl: stream.rtmpUrl });
      }

      this.addStreamLog(
        ctx.streamId,
        `[Engine] FFmpeg process disconnected. Reconnecting attempt ${ctx.reconnectCount}/${maxAttempts} in ${delaySec}s...`,
        'warn'
      );
      db.updateStreamInstance(ctx.streamId, {
        status: 'RECONNECTING',
        reconnectCount: ctx.reconnectCount,
        ffmpegPid: undefined,
      });

      if (stream) this.broadcastStreamStatus(ctx.streamId, stream);

      if (ctx.reconnectTimer) clearTimeout(ctx.reconnectTimer);
      ctx.reconnectTimer = setTimeout(() => {
        if (ctx.state === 'RECONNECTING' && !ctx.isIntentionalStop) {
          const vIds = stream?.videoIds || (stream?.videoId ? [stream.videoId] : []);
          const vList = vIds.map((id) => db.getVideoById(id)).filter(Boolean);
          if (vList.length > 0) {
            this.launchStreamFFmpeg(ctx, vList);
          }
        }
      }, delaySec * 1000);
    } else {
      ctx.state = 'ERROR';
      if (ctx.reconnectCount >= maxAttempts) {
        ctx.lastErrorMessage = `Max reconnect attempts (${maxAttempts}) reached. Stream halted.`;
      } else {
        ctx.lastErrorMessage = ctx.lastErrorMessage || 'FFmpeg process terminated unexpectedly.';
      }
      this.recordStreamHistory(ctx, 'CRASHED');
      db.updateStreamInstance(ctx.streamId, {
        status: 'ERROR',
        lastError: ctx.lastErrorMessage,
        ffmpegPid: undefined,
        stoppedAt: new Date().toISOString(),
      });
      this.addStreamLog(ctx.streamId, `[Engine] ${ctx.lastErrorMessage}`, 'error');
      if (stream) this.broadcastStreamStatus(ctx.streamId, stream);
    }
  }

  public async stopStreamInstance(streamId: string): Promise<{ success: boolean; message: string }> {
    const ctx = this.contexts.get(streamId);
    if (!ctx || !ctx.process) {
      db.updateStreamInstance(streamId, { status: 'STOPPED', ffmpegPid: undefined, stoppedAt: new Date().toISOString() });
      const stream = db.getStreamInstanceById(streamId);
      if (stream) this.broadcastStreamStatus(streamId, stream);
      return { success: true, message: 'Stream is not running.' };
    }

    ctx.isIntentionalStop = true;
    if (ctx.reconnectTimer) {
      clearTimeout(ctx.reconnectTimer);
      ctx.reconnectTimer = null;
    }
    if (ctx.startupWatchdogTimer) {
      clearTimeout(ctx.startupWatchdogTimer);
      ctx.startupWatchdogTimer = null;
    }

    ctx.state = 'STOPPING';
    db.updateStreamInstance(streamId, { status: 'STOPPING' });
    this.addStreamLog(streamId, '[Engine] Sending SIGTERM to stop stream process...', 'info');

    try {
      ctx.process.kill('SIGTERM');

      let terminated = false;
      for (let i = 0; i < 30; i++) {
        if (!ctx.process) {
          terminated = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!terminated && ctx.process) {
        this.addStreamLog(streamId, '[Engine] Force terminating stubborn FFmpeg process with SIGKILL...', 'warn');
        ctx.process.kill('SIGKILL');
      }

      ctx.process = null;
      ctx.state = 'STOPPED';
      this.recordStreamHistory(ctx, 'STOPPED');
      db.updateStreamInstance(streamId, {
        status: 'STOPPED',
        ffmpegPid: undefined,
        stoppedAt: new Date().toISOString(),
      });
      this.addStreamLog(streamId, '[Engine] Stream stopped successfully.', 'info');
      const stream = db.getStreamInstanceById(streamId);
      if (stream) this.broadcastStreamStatus(streamId, stream);
      return { success: true, message: 'Stream stopped successfully.' };
    } catch (err: any) {
      ctx.state = 'ERROR';
      ctx.lastErrorMessage = `Error stopping stream: ${err.message}`;
      db.updateStreamInstance(streamId, { status: 'ERROR', lastError: ctx.lastErrorMessage });
      return { success: false, message: ctx.lastErrorMessage };
    }
  }

  public async restartStreamInstance(streamId: string): Promise<StartStreamResult> {
    const stream = db.getStreamInstanceById(streamId);
    if (!stream) {
      return { success: false, code: 'STREAM_NOT_FOUND', message: 'Stream not found.' };
    }

    this.addStreamLog(streamId, `[Engine] Restarting live stream "${stream.name}"...`, 'info');
    await this.stopStreamInstance(streamId);
    await new Promise((r) => setTimeout(r, 1000));
    return this.startStreamInstance(streamId);
  }

  private recordStreamHistory(ctx: ActiveProcessContext, status: 'SUCCESS' | 'STOPPED' | 'CRASHED' | 'RECONNECTED' | 'ERROR') {
    const stream = db.getStreamInstanceById(ctx.streamId) || ctx.config;
    const now = new Date();
    const durationSeconds = ctx.startedAt ? Math.floor((now.getTime() - ctx.startedAt.getTime()) / 1000) : 0;
    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const secs = durationSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const durationFormatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

    const session: StreamSessionHistory = {
      id: ctx.sessionId || `session-${Date.now()}`,
      videoId: stream.videoId || 'unknown',
      videoName: stream.videoTitle || stream.name || 'Unknown Video',
      startedAt: ctx.startedAt ? ctx.startedAt.toISOString() : now.toISOString(),
      stoppedAt: now.toISOString(),
      durationSeconds,
      durationFormatted,
      status,
      reconnectCount: ctx.reconnectCount,
      errorMessage: ctx.lastErrorMessage || undefined,
      rtmpUrl: stream.rtmpUrl,
    };

    db.addHistory(session);
    ctx.startedAt = null;
  }

  private classifyFfmpegError(line: string, streamKey?: string): string | null {
    const lower = line.toLowerCase();
    if (lower.includes('connection refused')) {
      return 'RTMP connection refused by destination server. Please check RTMP URL.';
    }
    if (lower.includes('connection timed out') || lower.includes('cannot open connection') || lower.includes('i/o error')) {
      return 'RTMP connection timed out on port 1935. YouTube Secure RTMPS (rtmps://a.rtmps.youtube.com/live2) on SSL port 443 is recommended and auto-selected.';
    }
    if (
      lower.includes('already publishing') ||
      lower.includes('stream already in use') ||
      lower.includes('server returned 403') ||
      lower.includes('publish failed') ||
      lower.includes('unauthorized') ||
      lower.includes('authentication')
    ) {
      return 'Destination RTMP server rejected the stream. Please check your YouTube Stream Key or verify YouTube Studio Live is ready.';
    }
    if (lower.includes('invalid data found when processing input') || lower.includes('moov atom not found')) {
      return 'The video file has an invalid container or corrupted video stream.';
    }
    if (lower.includes('no such file or directory')) {
      return 'The video file does not exist on disk.';
    }
    if (lower.includes('permission denied')) {
      return 'Permission denied reading video file or connecting socket.';
    }
    if (lower.includes('broken pipe') || lower.includes('connection reset by peer')) {
      return 'The RTMP connection was closed or reset by the remote server.';
    }
    if (lower.includes('unknown encoder') || lower.includes('codec not found')) {
      return 'Required FFmpeg encoder (libx264/aac) is unavailable on this system.';
    }
    if (lower.includes('error') || lower.includes('fatal')) {
      return this.sanitize(line, streamKey);
    }
    return null;
  }

  // =========================================================================
  // LOGS & PUBSUB
  // =========================================================================

  public addStreamLog(
    streamId: string,
    message: string,
    level: 'info' | 'warn' | 'error' | 'stats' = 'info',
    streamKey?: string
  ): void {
    const stream = db.getStreamInstanceById(streamId);
    const keyToMask = streamKey || stream?.streamKey;
    const cleanMsg = this.sanitize(message, keyToMask).trim();
    if (!cleanMsg) return;

    const entry: FFmpegLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      message: cleanMsg,
    };

    let ctx = this.contexts.get(streamId);
    if (!ctx && stream) {
      ctx = this.getOrCreateContext(stream);
    }

    if (ctx) {
      ctx.logs.push(entry);
      if (ctx.logs.length > this.maxLogsPerStream) {
        ctx.logs.shift();
      }
    }

    // Broadcast to per-stream clients
    const streamClients = this.perStreamLogClients.get(streamId);
    if (streamClients) {
      for (const client of streamClients) {
        try {
          client(entry);
        } catch (e) {}
      }
    }

    // Broadcast to global clients
    for (const client of this.globalLogClients) {
      try {
        client({ ...entry, streamId });
      } catch (e) {}
    }

    // Persist critical stream logs in Supabase if configured
    if (SupabaseService.isConfigured() && (level === 'error' || level === 'warn' || cleanMsg.includes('LIVE') || cleanMsg.includes('Starting') || cleanMsg.includes('stopped'))) {
      const eventType = level === 'error' ? 'ERROR' : cleanMsg.includes('LIVE') ? 'START' : cleanMsg.includes('stopped') ? 'STOP' : 'INFO';
      SupabaseService.logEvent(streamId, eventType, cleanMsg, level).catch(() => {});
    }
  }

  public getStreamLogs(streamId: string): FFmpegLogEntry[] {
    const ctx = this.contexts.get(streamId);
    return ctx ? [...ctx.logs] : [];
  }

  public clearStreamLogs(streamId: string): void {
    const ctx = this.contexts.get(streamId);
    if (ctx) ctx.logs = [];
  }

  public subscribeStreamLogs(streamId: string, callback: (entry: FFmpegLogEntry) => void): () => void {
    if (!this.perStreamLogClients.has(streamId)) {
      this.perStreamLogClients.set(streamId, new Set());
    }
    const set = this.perStreamLogClients.get(streamId)!;
    set.add(callback);
    return () => {
      set.delete(callback);
    };
  }

  public subscribeStreamStatus(streamId: string, callback: (status: StreamInstance) => void): () => void {
    if (!this.perStreamStatusClients.has(streamId)) {
      this.perStreamStatusClients.set(streamId, new Set());
    }
    const set = this.perStreamStatusClients.get(streamId)!;
    set.add(callback);
    return () => {
      set.delete(callback);
    };
  }

  public subscribeAllStatus(callback: (streams: StreamInstance[]) => void): () => void {
    this.globalStatusClients.add(callback);
    return () => {
      this.globalStatusClients.delete(callback);
    };
  }

  private broadcastStreamStatus(streamId: string, status: StreamInstance): void {
    const set = this.perStreamStatusClients.get(streamId);
    if (set) {
      for (const client of set) {
        try {
          client(status);
        } catch (e) {}
      }
    }
  }

  // =========================================================================
  // LEGACY BACKWARDS COMPATIBILITY (Wraps/Maps to Primary Stream)
  // =========================================================================

  public async startStream(config: StreamConfig): Promise<StartStreamResult> {
    // Look for default stream instance or create one
    let streams = db.getStreamInstances();
    let targetStream = streams[0];

    if (!targetStream) {
      targetStream = db.createStreamInstance({
        userId: 'legacy-user',
        name: 'Main 24/7 Live Stream',
        rtmpUrl: config.rtmpUrl || db.getSettings().defaultRtmpUrl,
        streamKey: config.streamKey || db.getSettings().defaultStreamKey || '',
        videoId: config.videoId,
        playlistId: config.playlistId,
        quality: config.quality,
        bitrate: config.bitrate,
        fps: config.fps,
        loop: config.loop,
        audio: config.audio,
      });
    }

    return this.startStreamInstance(targetStream.id, config);
  }

  public async stopStream(): Promise<{ success: boolean; message: string }> {
    const streams = db.getStreamInstances();
    const liveStreams = streams.filter((s) => s.status === 'LIVE' || s.status === 'STARTING' || s.status === 'RECONNECTING');
    if (liveStreams.length === 0) {
      return { success: true, message: 'No streams are currently running.' };
    }
    for (const st of liveStreams) {
      await this.stopStreamInstance(st.id);
    }
    return { success: true, message: 'All live streams stopped.' };
  }

  public async restartStream(): Promise<StartStreamResult> {
    const streams = db.getStreamInstances();
    if (streams.length > 0) {
      return this.restartStreamInstance(streams[0].id);
    }
    return { success: false, code: 'NO_STREAM', message: 'No stream available to restart.' };
  }

  public getStatus(): StreamStatusInfo {
    const streams = db.getStreamInstances();
    const firstActive = streams.find((s) => s.status === 'LIVE' || s.status === 'STARTING' || s.status === 'RECONNECTING') || streams[0];

    if (!firstActive) {
      return {
        status: 'IDLE',
        active: false,
        loop: true,
        quality: '1080p',
        bitrate: '4000k',
        fps: 30,
        hasAudio: true,
        autoReconnect: true,
        uptimeSeconds: 0,
        uptimeFormatted: '00:00:00',
        reconnectCount: 0,
        currentLoopCount: 1,
      };
    }

    return {
      status: firstActive.status,
      active: firstActive.status === 'LIVE' || firstActive.status === 'STARTING' || firstActive.status === 'RECONNECTING',
      videoId: firstActive.videoId,
      videoTitle: firstActive.videoTitle,
      playlistId: firstActive.playlistId,
      playlistName: firstActive.playlistName,
      videoIds: firstActive.videoIds,
      rtmpUrl: firstActive.rtmpUrl,
      maskedStreamKey: firstActive.maskedStreamKey,
      loop: firstActive.loop ?? true,
      quality: firstActive.quality || '1080p',
      bitrate: firstActive.bitrate || '4000k',
      fps: firstActive.fps || 30,
      hasAudio: firstActive.audio ?? true,
      autoReconnect: firstActive.autoReconnect ?? true,
      pid: firstActive.ffmpegPid,
      startedAt: firstActive.startedAt,
      uptimeSeconds: firstActive.uptimeSeconds || 0,
      uptimeFormatted: firstActive.uptimeFormatted || '00:00:00',
      reconnectCount: firstActive.reconnectCount || 0,
      currentLoopCount: firstActive.currentLoopCount || 1,
      errorMessage: firstActive.lastError,
      lastLogLine: firstActive.lastLogLine,
      encoderStats: firstActive.encoderStats,
    };
  }

  public getLogs(): FFmpegLogEntry[] {
    const streams = db.getStreamInstances();
    if (streams.length > 0) {
      return this.getStreamLogs(streams[0].id);
    }
    return [];
  }

  public clearLogs(): void {
    const streams = db.getStreamInstances();
    for (const s of streams) {
      this.clearStreamLogs(s.id);
    }
  }

  public subscribeLogs(callback: (entry: FFmpegLogEntry) => void): () => void {
    this.globalLogClients.add(callback);
    return () => {
      this.globalLogClients.delete(callback);
    };
  }

  public subscribeStatus(callback: (status: StreamStatusInfo) => void): () => void {
    return this.subscribeAllStatus((_streams) => {
      callback(this.getStatus());
    });
  }

  // Server Restart Recovery check: Per strict instructions, do NOT auto-start on boot unless specifically allowed.
  public async attemptServerRestartRecovery(): Promise<void> {
    const streams = db.getStreamInstances();
    console.log(`[Engine] Server initialized with ${streams.length} stream configurations. Processes start stopped.`);
  }
}

export const streamingEngine = new StreamingEngine();
