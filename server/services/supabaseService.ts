import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseConfig, DatabaseDiagnostics, DatabaseTestResult, VideoItem, PlaylistItem, StreamInstance, FFmpegLogEntry } from '../../src/types.js';

class SupabaseServiceClass {
  private client: SupabaseClient | null = null;
  private currentUrl: string = '';
  private currentKey: string = '';

  constructor() {
    this.initFromEnv();
  }

  private initFromEnv(): void {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (url && key) {
      try {
        this.client = createClient(url.trim(), key.trim(), {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        this.currentUrl = url.trim();
        this.currentKey = key.trim();
        console.log('[SupabaseService] Initialized client from environment variables');
      } catch (err: any) {
        console.warn('[SupabaseService] Failed to initialize from environment:', err.message);
      }
    }
  }

  public isConfigured(): boolean {
    return !!(this.client && this.currentUrl && this.currentKey);
  }

  public getSanitizedConfig(): DatabaseConfig {
    const isConfigured = this.isConfigured();
    return {
      databaseProvider: 'supabase_postgres',
      configured: isConfigured,
      supabaseUrl: this.currentUrl,
      supabaseAnonKey: this.currentKey ? `${this.currentKey.slice(0, 8)}••••••••` : '',
    };
  }

  public async getDiagnostics(): Promise<DatabaseDiagnostics> {
    const isConfigured = this.isConfigured();
    if (!isConfigured) {
      return {
        urlConfigured: false,
        anonKeyConfigured: false,
        serviceRoleConfigured: false,
        endpointReachable: false,
        authSuccess: false,
        tablesVerified: false,
        connected: false,
        message: 'Supabase database is not configured. Application is using local cache fallback.',
      };
    }

    try {
      const test = await this.testConnection();
      return test.diagnostics || {
        urlConfigured: true,
        anonKeyConfigured: true,
        serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        endpointReachable: test.connected,
        authSuccess: test.connected,
        tablesVerified: test.connected,
        connected: test.connected,
        message: test.message,
        recordCounts: test.recordCounts,
        tables: test.tables,
      };
    } catch (e: any) {
      return {
        urlConfigured: true,
        anonKeyConfigured: true,
        serviceRoleConfigured: false,
        endpointReachable: false,
        authSuccess: false,
        tablesVerified: false,
        connected: false,
        message: `Diagnostics error: ${e.message}`,
      };
    }
  }

  public saveSettings(data: Partial<DatabaseConfig>): DatabaseConfig {
    if (data.supabaseUrl && data.supabaseAnonKey) {
      this.updateCredentials(data.supabaseUrl, data.supabaseAnonKey);
    }
    return this.getSanitizedConfig();
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.initFromEnv();
    }
    return this.client;
  }

  public updateCredentials(url: string, key: string): void {
    if (!url || !key) {
      this.client = null;
      this.currentUrl = '';
      this.currentKey = '';
      return;
    }

    try {
      this.client = createClient(url.trim(), key.trim(), {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      this.currentUrl = url.trim();
      this.currentKey = key.trim();
    } catch (err: any) {
      console.warn('[SupabaseService] Update credentials error:', err.message);
      throw new Error(`Failed to configure Supabase client: ${err.message}`);
    }
  }

  public async testConnection(override?: {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    supabaseServiceRoleKey?: string;
  }): Promise<DatabaseTestResult> {
    const url = (override?.supabaseUrl || process.env.SUPABASE_URL || this.currentUrl || '').trim();
    const key = (override?.supabaseServiceRoleKey || override?.supabaseAnonKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || this.currentKey || '').trim();

    const diagnostics: DatabaseDiagnostics = {
      urlConfigured: false,
      anonKeyConfigured: false,
      serviceRoleConfigured: false,
      endpointReachable: false,
      authSuccess: false,
      tablesVerified: false,
      message: 'Checking connection parameters...',
      tableDetails: {
        videos: false,
        playlists: false,
        streams: false,
        stream_logs: false,
        system_settings: false,
      },
    };

    if (!url) {
      return {
        success: false,
        connected: false,
        message: 'Supabase URL is missing. Please provide your Supabase project URL.',
        error: 'MISSING_URL',
        diagnostics,
        testedAt: new Date().toISOString(),
      };
    }

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error('Protocol must be http or https');
      }
      diagnostics.urlConfigured = true;
    } catch (e: any) {
      return {
        success: false,
        connected: false,
        message: `Invalid Supabase URL format: ${e.message}`,
        error: 'INVALID_URL',
        diagnostics,
        testedAt: new Date().toISOString(),
      };
    }

    if (!key) {
      return {
        success: false,
        connected: false,
        message: 'Supabase API Key (Anon or Service-Role) is missing.',
        error: 'MISSING_KEY',
        diagnostics,
        testedAt: new Date().toISOString(),
      };
    }

    diagnostics.anonKeyConfigured = !!(override?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || key);
    diagnostics.serviceRoleConfigured = !!(override?.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
      const testClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 1. Test endpoint reachability & authentication by querying system_settings or videos
      const checkPromises = [
        testClient.from('system_settings').select('setting_key').limit(1),
        testClient.from('videos').select('id').limit(1),
        testClient.from('playlists').select('id').limit(1),
        testClient.from('streams').select('id').limit(1),
        testClient.from('stream_logs').select('id').limit(1),
      ];

      const [settingsRes, videosRes, playlistsRes, streamsRes, logsRes] = await Promise.allSettled(checkPromises);

      diagnostics.endpointReachable = true;

      // Check if any error was an invalid API key / JWT error
      const anyResult = [settingsRes, videosRes, playlistsRes, streamsRes, logsRes];
      for (const res of anyResult) {
        if (res.status === 'fulfilled' && res.value.error) {
          const err = res.value.error;
          if (err.message && (err.message.includes('JWT') || err.message.includes('Invalid API key') || err.message.includes('unauthorized') || err.code === 'PGRST301')) {
            diagnostics.authSuccess = false;
            return {
              success: false,
              connected: false,
              message: `Supabase authentication failed: ${err.message}. Please check your Anon / Service-Role API Key.`,
              error: 'AUTH_FAILED',
              diagnostics,
              testedAt: new Date().toISOString(),
            };
          }
        }
      }

      diagnostics.authSuccess = true;

      // Check table statuses
      if (settingsRes.status === 'fulfilled' && !settingsRes.value.error) {
        diagnostics.tableDetails!.system_settings = true;
      }
      if (videosRes.status === 'fulfilled' && !videosRes.value.error) {
        diagnostics.tableDetails!.videos = true;
      }
      if (playlistsRes.status === 'fulfilled' && !playlistsRes.value.error) {
        diagnostics.tableDetails!.playlists = true;
      }
      if (streamsRes.status === 'fulfilled' && !streamsRes.value.error) {
        diagnostics.tableDetails!.streams = true;
      }
      if (logsRes.status === 'fulfilled' && !logsRes.value.error) {
        diagnostics.tableDetails!.stream_logs = true;
      }

      const allTablesFound = Object.values(diagnostics.tableDetails!).every(Boolean);
      diagnostics.tablesVerified = allTablesFound;

      // Update active client if successful
      this.updateCredentials(url, key);

      let msg = '✓ SUPABASE CONNECTED: Database connection and authentication successful.';
      if (!allTablesFound) {
        msg = '✓ SUPABASE CONNECTED: Authentication verified. Core tables migration can be applied in Supabase SQL Editor.';
      }

      diagnostics.message = msg;

      return {
        success: true,
        connected: true,
        message: msg,
        diagnostics,
        testedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[SupabaseService] Test connection error:', err);
      let errorCategory = 'CONNECTION_FAILED';
      let cleanMsg = err.message || 'Database unavailable';

      if (cleanMsg.includes('ENOTFOUND') || cleanMsg.includes('fetch failed')) {
        errorCategory = 'NETWORK_ERROR';
        cleanMsg = 'Network error: Unable to reach the Supabase host. Check the project URL.';
      }

      diagnostics.message = cleanMsg;

      return {
        success: false,
        connected: false,
        message: `Connection failed: ${cleanMsg}`,
        error: errorCategory,
        diagnostics,
        testedAt: new Date().toISOString(),
      };
    }
  }

  // ==========================================
  // VIDEOS CRUD (METADATA IN SUPABASE)
  // ==========================================
  public async getVideos(options?: { search?: string; limit?: number; offset?: number }): Promise<{ videos: VideoItem[]; total: number } | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      let query = client.from('videos').select('*', { count: 'exact' });

      if (options?.search && options.search.trim()) {
        query = query.ilike('original_name', `%${options.search.trim()}%`);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit && options.limit > 0) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, count, error } = await query;
      if (error) {
        console.warn('[SupabaseService] getVideos query error:', error.message);
        return null;
      }

      const videos: VideoItem[] = (data || []).map((row) => ({
        id: row.id,
        originalName: row.original_name,
        storedName: row.stored_name || row.original_name,
        filename: row.stored_name || row.original_name,
        path: '', // In Cloudflare R2 mode, physical file on VPS is deleted
        thumbnailUrl: row.thumbnail_url || '',
        size: Number(row.file_size || 0),
        duration: Number(row.duration || 0),
        durationFormatted: this.formatDuration(Number(row.duration || 0)),
        width: row.width || 1920,
        height: row.height || 1080,
        resolution: row.width && row.height ? `${row.width}x${row.height}` : '1080p',
        fps: Number(row.fps || 30),
        codec: row.codec || 'h264',
        audioCodec: row.audio_codec || 'aac',
        hasAudio: row.has_audio !== false,
        bitrate: row.bitrate ? Number(row.bitrate) : undefined,
        source: 'r2',
        r2ObjectKey: row.r2_object_key,
        r2Bucket: row.r2_bucket,
        storageProvider: 'cloudflare_r2',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return { videos, total: count || videos.length };
    } catch (err: any) {
      console.warn('[SupabaseService] getVideos exception:', err.message);
      return null;
    }
  }

  public async getVideoById(id: string): Promise<VideoItem | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('videos').select('*').eq('id', id).single();
      if (error || !data) return null;

      return {
        id: data.id,
        originalName: data.original_name,
        storedName: data.stored_name || data.original_name,
        filename: data.stored_name || data.original_name,
        path: '',
        thumbnailUrl: data.thumbnail_url || '',
        size: Number(data.file_size || 0),
        duration: Number(data.duration || 0),
        durationFormatted: this.formatDuration(Number(data.duration || 0)),
        width: data.width || 1920,
        height: data.height || 1080,
        resolution: data.width && data.height ? `${data.width}x${data.height}` : '1080p',
        fps: Number(data.fps || 30),
        codec: data.codec || 'h264',
        audioCodec: data.audio_codec || 'aac',
        hasAudio: data.has_audio !== false,
        bitrate: data.bitrate ? Number(data.bitrate) : undefined,
        source: 'r2',
        r2ObjectKey: data.r2_object_key,
        r2Bucket: data.r2_bucket,
        storageProvider: 'cloudflare_r2',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (e) {
      return null;
    }
  }

  public async insertVideo(video: VideoItem): Promise<VideoItem> {
    const client = this.getClient();
    if (!client) {
      return video;
    }

    const payload = {
      id: video.id,
      original_name: video.originalName,
      stored_name: video.storedName,
      r2_object_key: video.r2ObjectKey || video.id,
      r2_bucket: video.r2Bucket || process.env.R2_BUCKET_NAME || 'castloop-videos',
      mime_type: 'video/mp4',
      file_size: video.size,
      duration: video.duration,
      width: video.width,
      height: video.height,
      fps: video.fps,
      codec: video.codec,
      audio_codec: video.audioCodec,
      has_audio: video.hasAudio,
      bitrate: video.bitrate,
      thumbnail_url: video.thumbnailUrl,
      status: 'READY',
      created_at: video.createdAt || new Date().toISOString(),
      updated_at: video.updatedAt || new Date().toISOString(),
    };

    const { error } = await client.from('videos').upsert(payload);
    if (error) {
      console.error('[SupabaseService] insertVideo error:', error);
      throw new Error(`Failed to save video metadata in Supabase: ${error.message}`);
    }

    return video;
  }

  public async updateVideo(id: string, updates: Partial<VideoItem>): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.originalName !== undefined) payload.original_name = updates.originalName;
    if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl;

    const { error } = await client.from('videos').update(payload).eq('id', id);
    return !error;
  }

  public async deleteVideo(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    const { error } = await client.from('videos').delete().eq('id', id);
    if (error) {
      console.warn('[SupabaseService] deleteVideo error:', error.message);
      return false;
    }
    return true;
  }

  // ==========================================
  // PLAYLISTS CRUD
  // ==========================================
  public async getPlaylists(): Promise<PlaylistItem[] | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data: playlists, error: plErr } = await client
        .from('playlists')
        .select('*, playlist_videos(video_id, position)')
        .order('updated_at', { ascending: false });

      if (plErr) {
        console.warn('[SupabaseService] getPlaylists error:', plErr.message);
        return null;
      }

      return (playlists || []).map((pl) => {
        const sortedVids = (pl.playlist_videos || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        const videoIds = sortedVids.map((v: any) => v.video_id);
        const totalDuration = Number(pl.total_duration || 0);

        return {
          id: pl.id,
          name: pl.name,
          description: pl.description || '',
          videoIds,
          totalDuration,
          totalDurationFormatted: this.formatDuration(totalDuration),
          createdAt: pl.created_at,
          updatedAt: pl.updated_at,
        };
      });
    } catch (err: any) {
      console.warn('[SupabaseService] getPlaylists exception:', err.message);
      return null;
    }
  }

  public async createPlaylist(playlist: PlaylistItem): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('playlists').upsert({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        total_duration: playlist.totalDuration,
        created_at: playlist.createdAt,
        updated_at: playlist.updatedAt,
      });

      if (error) {
        console.warn('[SupabaseService] createPlaylist error:', error.message);
        return false;
      }

      if (playlist.videoIds && playlist.videoIds.length > 0) {
        const relations = playlist.videoIds.map((vid, idx) => ({
          playlist_id: playlist.id,
          video_id: vid,
          position: idx,
        }));
        await client.from('playlist_videos').insert(relations);
      }

      return true;
    } catch (e: any) {
      return false;
    }
  }

  public async deletePlaylist(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    const { error } = await client.from('playlists').delete().eq('id', id);
    return !error;
  }

  // ==========================================
  // STREAMS CRUD & LOGS
  // ==========================================
  public async getStreams(): Promise<StreamInstance[] | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('streams').select('*').order('created_at', { ascending: false });
      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id || 'system',
        userName: row.user_name,
        name: row.name,
        rtmpUrl: row.rtmp_url,
        streamKey: row.stream_key,
        maskedStreamKey: row.stream_key ? `••••••••${row.stream_key.slice(-4)}` : undefined,
        playlistId: row.playlist_id,
        playlistName: row.playlist_name,
        videoId: row.current_video_id,
        videoTitle: row.video_title,
        loop: row.loop !== false,
        quality: row.quality || '1080p',
        bitrate: row.bitrate || '4000k',
        fps: (row.fps === 'source' ? 'source' : Number(row.fps || 30)) as any,
        audio: row.audio !== false,
        autoReconnect: row.auto_reconnect !== false,
        reconnectDelaySeconds: row.reconnect_delay_seconds || 5,
        maxReconnectAttempts: row.max_reconnect_attempts || 20,
        status: row.status || 'STOPPED',
        ffmpegPid: row.ffmpeg_pid ? Number(row.ffmpeg_pid) : undefined,
        startedAt: row.started_at,
        stoppedAt: row.stopped_at,
        uptimeSeconds: Number(row.uptime_seconds || 0),
        uptimeFormatted: row.uptime_formatted || '00:00:00',
        reconnectCount: row.reconnect_count || 0,
        currentLoopCount: row.current_loop_count || 1,
        lastError: row.last_error,
        lastLogLine: row.last_log_line,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (e) {
      return null;
    }
  }

  public async saveStream(stream: StreamInstance): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload: any = {
        id: stream.id,
        user_id: stream.userId,
        user_name: stream.userName,
        name: stream.name,
        rtmp_url: stream.rtmpUrl,
        stream_key: stream.streamKey,
        playlist_id: stream.playlistId || null,
        playlist_name: stream.playlistName,
        current_video_id: stream.videoId || null,
        video_title: stream.videoTitle,
        loop: stream.loop !== false,
        quality: stream.quality,
        bitrate: stream.bitrate,
        fps: stream.fps,
        audio: stream.audio !== false,
        auto_reconnect: stream.autoReconnect !== false,
        reconnect_delay_seconds: stream.reconnectDelaySeconds,
        max_reconnect_attempts: stream.maxReconnectAttempts,
        status: stream.status,
        ffmpeg_pid: stream.ffmpegPid || null,
        started_at: stream.startedAt || null,
        stopped_at: stream.stoppedAt || null,
        uptime_seconds: stream.uptimeSeconds || 0,
        uptime_formatted: stream.uptimeFormatted || '00:00:00',
        reconnect_count: stream.reconnectCount || 0,
        current_loop_count: stream.currentLoopCount || 1,
        last_error: stream.lastError || null,
        last_log_line: stream.lastLogLine || null,
        created_at: stream.createdAt,
        updated_at: stream.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('streams').upsert(payload);
      return !error;
    } catch (e) {
      return false;
    }
  }

  public async updateStreamStatus(
    streamId: string,
    status: string,
    extra?: { ffmpegPid?: number | null; startedAt?: string | null; stoppedAt?: string | null; lastError?: string | null }
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (extra?.ffmpegPid !== undefined) payload.ffmpeg_pid = extra.ffmpegPid;
      if (extra?.startedAt !== undefined) payload.started_at = extra.startedAt;
      if (extra?.stoppedAt !== undefined) payload.stopped_at = extra.stoppedAt;
      if (extra?.lastError !== undefined) payload.last_error = extra.lastError;

      const { error } = await client.from('streams').update(payload).eq('id', streamId);
      return !error;
    } catch (e) {
      return false;
    }
  }

  public async logEvent(streamId: string | undefined, eventType: string, message: string, level: string = 'info'): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.from('stream_logs').insert({
        stream_id: streamId || null,
        event_type: eventType,
        level,
        message,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Non-blocking log insertion
    }
  }

  private formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
}

export const SupabaseService = new SupabaseServiceClass();
