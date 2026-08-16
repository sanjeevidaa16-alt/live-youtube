import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, VideoItem, PlaylistItem, StreamConfig, StreamInstance, StreamSessionHistory, SystemSettings } from '../../src/types.js';

interface DatabaseSchema {
  users: Array<{
    id: string;
    username: string;
    name?: string;
    email?: string;
    avatar?: string;
    googleId?: string;
    passwordHash?: string;
    role: 'admin' | 'user';
    createdAt: string;
  }>;
  videos: VideoItem[];
  playlists: PlaylistItem[];
  streamInstances: StreamInstance[];
  activeConfig: (StreamConfig & { active: boolean; startedAt?: string }) | null;
  history: StreamSessionHistory[];
  settings: SystemSettings;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

const defaultSettings: SystemSettings = {
  defaultRtmpUrl: process.env.DEFAULT_RTMP_URL || 'rtmps://a.rtmps.youtube.com/live2',
  defaultQuality: '1080p',
  defaultBitrate: '4000k',
  defaultFps: 30,
  autoReconnect: true,
  reconnectDelay: 5,
  maxReconnectAttempts: 20,
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '25600', 10),
  allowedExtensions: ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.ts', '.flv', '.m4v', '.3gp', '.wmv', '.mpeg', '.mpg'],
  autoRestartOnServerBoot: false, // Per strict requirements: VPS restart does not auto-start streams. User must manually click START.
  maxConcurrentStreams: 5,
};

class Database {
  private data: DatabaseSchema;
  private isWriting = false;
  private pendingWrite = false;

  constructor() {
    this.data = this.load();
    this.seedDefaultAdmin();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const loadedSettings: SystemSettings = { ...defaultSettings, ...(parsed.settings || {}) };

        // Upgrade legacy low limit to 25600MB (25GB) default for 10GB+ support
        if (!loadedSettings.maxUploadSizeMb || loadedSettings.maxUploadSizeMb <= 5120) {
          loadedSettings.maxUploadSizeMb = 25600;
        }

        // Upgrade legacy port 1935 RTMP to port 443 RTMPS for YouTube
        if (
          loadedSettings.defaultRtmpUrl &&
          (loadedSettings.defaultRtmpUrl.includes('rtmp://a.rtmp.youtube.com') ||
            loadedSettings.defaultRtmpUrl.includes('rtmp://b.rtmp.youtube.com'))
        ) {
          loadedSettings.defaultRtmpUrl = loadedSettings.defaultRtmpUrl.replace('rtmp://', 'rtmps://').replace('.rtmp.', '.rtmps.');
        }

        // Ensure all modern extensions are included
        const fullExts = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.ts', '.flv', '.m4v', '.3gp', '.wmv', '.mpeg', '.mpg'];
        if (loadedSettings.allowedExtensions) {
          for (const ext of fullExts) {
            if (!loadedSettings.allowedExtensions.includes(ext)) {
              loadedSettings.allowedExtensions.push(ext);
            }
          }
        }

        // Ensure maxConcurrentStreams is present
        if (!loadedSettings.maxConcurrentStreams) {
          loadedSettings.maxConcurrentStreams = 5;
        }

        const rawStreams: StreamInstance[] = parsed.streamInstances || [];
        // On server reboot: All stream instances must start as STOPPED with cleared PID (processes do not survive restart)
        const cleanedStreams = rawStreams.map((st) => ({
          ...st,
          status: (st.status === 'LIVE' || st.status === 'STARTING' || st.status === 'RECONNECTING' ? 'STOPPED' : st.status) as any,
          ffmpegPid: undefined,
        }));

        return {
          users: parsed.users || [],
          videos: parsed.videos || [],
          playlists: parsed.playlists || [],
          streamInstances: cleanedStreams,
          activeConfig: parsed.activeConfig || null,
          history: parsed.history || [],
          settings: loadedSettings,
        };
      }
    } catch (err) {
      console.error('[DB] Failed to read database file, initializing default:', err);
    }

    return {
      users: [],
      videos: [],
      playlists: [],
      streamInstances: [],
      activeConfig: null,
      history: [],
      settings: defaultSettings,
    };
  }

  private persist(): void {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }

    this.isWriting = true;
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(this.data, null, 2);

    fs.writeFile(tempFile, payload, 'utf8', (err) => {
      if (err) {
        console.error('[DB] Error writing temp database file:', err);
        this.isWriting = false;
        return;
      }

      fs.rename(tempFile, DB_FILE, (renameErr) => {
        this.isWriting = false;
        if (renameErr) {
          console.error('[DB] Error replacing database file:', renameErr);
        }

        if (this.pendingWrite) {
          this.pendingWrite = false;
          this.persist();
        }
      });
    });
  }

  private seedDefaultAdmin() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    let existingAdmin = this.data.users.find(
      (u) => u.username.toLowerCase() === adminUsername.toLowerCase() && u.role === 'admin'
    );
    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(adminPassword, salt);
      existingAdmin = {
        id: crypto.randomUUID(),
        username: adminUsername,
        name: 'LIGHT GAMING 4M Admin',
        email: 'admin@castloop.local',
        passwordHash,
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
      };
      this.data.users.push(existingAdmin);
      this.persist();
      console.log(`[DB] Default admin user initialized: '${adminUsername}'`);
    } else {
      // Ensure admin password hash is updated to standard password
      const salt = bcrypt.genSaltSync(10);
      existingAdmin.passwordHash = bcrypt.hashSync(adminPassword, salt);
      this.persist();
    }

    // Seed demo user for instant testing
    let existingDemo = this.data.users.find(
      (u) => u.username.toLowerCase() === 'demo'
    );
    if (!existingDemo) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('Demo@123456', salt);
      existingDemo = {
        id: crypto.randomUUID(),
        username: 'demo',
        name: 'Demo Streamer',
        email: 'demo@castloop.local',
        passwordHash,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
      };
      this.data.users.push(existingDemo);
      this.persist();
      console.log(`[DB] Demo user initialized: 'demo'`);
    } else {
      const salt = bcrypt.genSaltSync(10);
      existingDemo.passwordHash = bcrypt.hashSync('Demo@123456', salt);
      this.persist();
    }
  }

  // --- User Operations ---
  public getUsers(): User[] {
    return this.data.users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  public findUserByUsername(username: string) {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public findUserById(id: string): User | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      googleId: user.googleId,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  public findUserByEmail(email: string) {
    return this.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  }

  public findOrCreateFirebaseUser(profile: {
    id: string;
    email: string;
    username: string;
    name?: string;
    avatar?: string;
    authProvider?: string;
  }): User {
    let existing = this.data.users.find(
      (u) => u.id === profile.id || (u.email && u.email.toLowerCase() === profile.email.toLowerCase())
    );

    if (existing) {
      existing.id = profile.id; // ensure ID matches Firebase UID
      if (profile.name) existing.name = profile.name;
      if (profile.username && !existing.username) existing.username = profile.username;
      if (profile.avatar) existing.avatar = profile.avatar;
      this.persist();
      return {
        id: existing.id,
        username: existing.username,
        name: existing.name,
        email: existing.email,
        avatar: existing.avatar,
        googleId: existing.googleId,
        role: existing.role,
        createdAt: existing.createdAt,
      };
    }

    const newUser = {
      id: profile.id,
      username: profile.username || profile.email.split('@')[0],
      name: profile.name || profile.username || profile.email.split('@')[0],
      email: profile.email,
      avatar: profile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.username || profile.email)}`,
      role: 'user' as const,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.persist();

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  }

  public registerUser(params: {
    username: string;
    email: string;
    password: string;
    name?: string;
  }) {
    const cleanUsername = params.username.trim();
    const cleanEmail = params.email.trim().toLowerCase();

    const existingUsername = this.data.users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existingUsername) {
      throw new Error('Username is already taken. Please choose another username.');
    }

    const existingEmail = this.data.users.find(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );
    if (existingEmail) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(params.password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      username: cleanUsername,
      name: params.name?.trim() || cleanUsername,
      email: cleanEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      passwordHash,
      role: 'user' as const,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.persist();

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  }

  public findOrCreateGoogleUser(googleProfile: {
    googleId?: string;
    email: string;
    name: string;
    avatar?: string;
  }): User {
    let existing = this.data.users.find(
      (u) => (googleProfile.googleId && u.googleId === googleProfile.googleId) ||
             (u.email && u.email.toLowerCase() === googleProfile.email.toLowerCase())
    );

    if (existing) {
      // Update profile details
      existing.name = googleProfile.name || existing.name;
      existing.avatar = googleProfile.avatar || existing.avatar;
      if (googleProfile.googleId && !existing.googleId) {
        existing.googleId = googleProfile.googleId;
      }
      this.persist();
      return {
        id: existing.id,
        username: existing.username,
        name: existing.name,
        email: existing.email,
        avatar: existing.avatar,
        googleId: existing.googleId,
        role: existing.role,
        createdAt: existing.createdAt,
      };
    }

    const username = googleProfile.email.split('@')[0] + '-' + Math.random().toString(36).substring(2, 6);
    const newUser = {
      id: crypto.randomUUID(),
      username,
      name: googleProfile.name || googleProfile.email.split('@')[0],
      email: googleProfile.email,
      avatar: googleProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleProfile.email)}`,
      googleId: googleProfile.googleId,
      role: 'user' as const,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.persist();

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      googleId: newUser.googleId,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  }

  public updatePassword(userId: string, newPassword: string): boolean {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    this.persist();
    return true;
  }

  public deleteUser(userId: string): boolean {
    const idx = this.data.users.findIndex((u) => u.id === userId && u.role !== 'admin');
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.persist();
    return true;
  }

  // --- Video Operations ---
  public getVideos(): VideoItem[] {
    return [...this.data.videos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getVideoById(id: string): VideoItem | null {
    return this.data.videos.find((v) => v.id === id) || null;
  }

  public addVideo(video: VideoItem): VideoItem {
    this.data.videos.push(video);
    this.persist();
    return video;
  }

  public updateVideo(id: string, updates: Partial<VideoItem>): VideoItem | null {
    const idx = this.data.videos.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    this.data.videos[idx] = { ...this.data.videos[idx], ...updates };
    this.persist();
    return this.data.videos[idx];
  }

  public isVideoActiveInAnyStream(videoId: string): boolean {
    // Check legacy single activeConfig
    if (this.data.activeConfig?.active) {
      if (this.data.activeConfig.videoId === videoId) return true;
      if (this.data.activeConfig.videoIds && this.data.activeConfig.videoIds.includes(videoId)) return true;
      if (this.data.activeConfig.playlistId) {
        const pl = this.getPlaylistById(this.data.activeConfig.playlistId);
        if (pl && pl.videoIds.includes(videoId)) return true;
      }
    }

    // Check all active StreamInstances (LIVE, STARTING, RECONNECTING)
    const activeStatuses = ['LIVE', 'STARTING', 'RECONNECTING'];
    for (const stream of this.data.streamInstances) {
      if (activeStatuses.includes(stream.status)) {
        if (stream.videoId === videoId) return true;
        if (stream.videoIds && stream.videoIds.includes(videoId)) return true;
        if (stream.playlistId) {
          const pl = this.getPlaylistById(stream.playlistId);
          if (pl && pl.videoIds.includes(videoId)) return true;
        }
      }
    }

    return false;
  }

  public deleteVideo(id: string): { success: boolean; error?: string; reason?: string } {
    const video = this.getVideoById(id);
    if (!video) {
      return { success: false, reason: 'NOT_FOUND', error: 'Video file not found or already deleted.' };
    }

    // 1. Protection check: Is video currently used by ANY active stream?
    if (this.isVideoActiveInAnyStream(id)) {
      return {
        success: false,
        reason: 'ACTIVE_STREAM_IN_USE',
        error: 'This video is currently being used by an active livestream. Stop the stream before deleting it.',
      };
    }

    // 2. Delete physical video file from VPS storage
    try {
      if (fs.existsSync(video.path)) {
        fs.unlinkSync(video.path);
      }
    } catch (e: any) {
      console.warn(`[DB] Failed to delete physical video file at ${video.path}:`, e.message);
    }

    // 3. Delete thumbnail if exists
    if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/thumbnails/')) {
      const thumbFile = path.join(UPLOAD_DIR, 'thumbnails', path.basename(video.thumbnailUrl));
      try {
        if (fs.existsSync(thumbFile)) {
          fs.unlinkSync(thumbFile);
        }
      } catch (e: any) {
        console.warn(`[DB] Failed to delete thumbnail file at ${thumbFile}:`, e.message);
      }
    }

    // 4. Remove from video list
    this.data.videos = this.data.videos.filter((v) => v.id !== id);

    // 5. Clean up references in all playlists without breaking the playlist
    for (const pl of this.data.playlists) {
      if (pl.videoIds.includes(id)) {
        pl.videoIds = pl.videoIds.filter((vid) => vid !== id);
        let totalDuration = 0;
        for (const vid of pl.videoIds) {
          const v = this.getVideoById(vid);
          if (v) totalDuration += v.duration || 0;
        }
        const hrs = Math.floor(totalDuration / 3600);
        const mins = Math.floor((totalDuration % 3600) / 60);
        const secs = totalDuration % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        pl.totalDuration = totalDuration;
        pl.totalDurationFormatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
        pl.updatedAt = new Date().toISOString();
      }
    }

    // 6. Clean up references in inactive stream instances
    for (const stream of this.data.streamInstances) {
      if (stream.videoId === id) {
        stream.videoId = undefined;
        stream.videoTitle = undefined;
      }
      if (stream.videoIds) {
        stream.videoIds = stream.videoIds.filter((vid) => vid !== id);
      }
    }

    this.persist();
    return { success: true };
  }

  // --- Multi-Stream Instances Operations ---
  public getStreamInstances(userId?: string): StreamInstance[] {
    let list = this.data.streamInstances || [];
    if (userId) {
      list = list.filter((s) => s.userId === userId);
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getStreamInstanceById(id: string): StreamInstance | null {
    return (this.data.streamInstances || []).find((s) => s.id === id) || null;
  }

  public createStreamInstance(params: {
    userId: string;
    userName?: string;
    name: string;
    rtmpUrl: string;
    streamKey: string;
    playlistId?: string;
    playlistName?: string;
    videoId?: string;
    videoTitle?: string;
    videoIds?: string[];
    loop?: boolean;
    quality?: any;
    bitrate?: any;
    fps?: any;
    audio?: boolean;
    autoReconnect?: boolean;
  }): StreamInstance {
    const now = new Date().toISOString();
    const cleanKey = (params.streamKey || '').trim();
    const maskedKey = cleanKey ? `••••••••${cleanKey.slice(-4)}` : undefined;

    const newInstance: StreamInstance = {
      id: crypto.randomUUID(),
      userId: params.userId,
      userName: params.userName,
      name: params.name || '24/7 Live Stream',
      rtmpUrl: params.rtmpUrl || this.data.settings.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2',
      streamKey: cleanKey,
      maskedStreamKey: maskedKey,
      playlistId: params.playlistId,
      playlistName: params.playlistName,
      videoId: params.videoId,
      videoTitle: params.videoTitle,
      videoIds: params.videoIds,
      loop: params.loop !== false,
      quality: params.quality || this.data.settings.defaultQuality || '1080p',
      bitrate: params.bitrate || this.data.settings.defaultBitrate || '4000k',
      fps: params.fps || this.data.settings.defaultFps || 30,
      audio: params.audio !== false,
      autoReconnect: params.autoReconnect !== false,
      reconnectDelaySeconds: this.data.settings.reconnectDelay || 5,
      maxReconnectAttempts: this.data.settings.maxReconnectAttempts || 20,
      status: 'IDLE',
      uptimeSeconds: 0,
      uptimeFormatted: '00:00:00',
      reconnectCount: 0,
      currentLoopCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.data.streamInstances) {
      this.data.streamInstances = [];
    }

    this.data.streamInstances.push(newInstance);
    this.persist();
    return newInstance;
  }

  public updateStreamInstance(id: string, updates: Partial<StreamInstance>): StreamInstance | null {
    const stream = this.getStreamInstanceById(id);
    if (!stream) return null;

    if (updates.streamKey !== undefined) {
      const cleanKey = updates.streamKey.trim();
      stream.streamKey = cleanKey;
      stream.maskedStreamKey = cleanKey ? `••••••••${cleanKey.slice(-4)}` : undefined;
    }

    const allowedFields: (keyof StreamInstance)[] = [
      'name',
      'rtmpUrl',
      'playlistId',
      'playlistName',
      'videoId',
      'videoTitle',
      'videoIds',
      'loop',
      'quality',
      'bitrate',
      'fps',
      'audio',
      'autoReconnect',
      'status',
      'ffmpegPid',
      'startedAt',
      'stoppedAt',
      'uptimeSeconds',
      'uptimeFormatted',
      'reconnectCount',
      'currentLoopCount',
      'lastError',
      'lastLogLine',
      'encoderStats',
    ];

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        (stream as any)[key] = updates[key];
      }
    }

    stream.updatedAt = new Date().toISOString();
    this.persist();
    return stream;
  }

  public deleteStreamInstance(id: string): boolean {
    const idx = (this.data.streamInstances || []).findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.streamInstances.splice(idx, 1);
    this.persist();
    return true;
  }

  public getActiveStreamCount(): number {
    const activeStatuses = ['LIVE', 'STARTING', 'RECONNECTING'];
    return (this.data.streamInstances || []).filter((s) => activeStatuses.includes(s.status)).length;
  }

  // --- Playlist Operations ---
  public getPlaylists(): PlaylistItem[] {
    return [...this.data.playlists].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getPlaylistById(id: string): PlaylistItem | null {
    return this.data.playlists.find((p) => p.id === id) || null;
  }

  public createPlaylist(name: string, videoIds: string[] = [], description?: string): PlaylistItem {
    const now = new Date().toISOString();
    
    // Calculate total duration
    let totalDuration = 0;
    for (const vid of videoIds) {
      const v = this.getVideoById(vid);
      if (v) totalDuration += v.duration || 0;
    }
    const hrs = Math.floor(totalDuration / 3600);
    const mins = Math.floor((totalDuration % 3600) / 60);
    const secs = totalDuration % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const totalDurationFormatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

    const playlist: PlaylistItem = {
      id: crypto.randomUUID(),
      name,
      description,
      videoIds,
      totalDuration,
      totalDurationFormatted,
      createdAt: now,
      updatedAt: now,
    };

    this.data.playlists.push(playlist);
    this.persist();
    return playlist;
  }

  public updatePlaylist(id: string, updates: Partial<{ name: string; description: string; videoIds: string[] }>): PlaylistItem | null {
    const playlist = this.data.playlists.find((p) => p.id === id);
    if (!playlist) return null;

    if (updates.name !== undefined) playlist.name = updates.name;
    if (updates.description !== undefined) playlist.description = updates.description;
    if (updates.videoIds !== undefined) {
      playlist.videoIds = updates.videoIds;
      let totalDuration = 0;
      for (const vid of playlist.videoIds) {
        const v = this.getVideoById(vid);
        if (v) totalDuration += v.duration || 0;
      }
      const hrs = Math.floor(totalDuration / 3600);
      const mins = Math.floor((totalDuration % 3600) / 60);
      const secs = totalDuration % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      playlist.totalDuration = totalDuration;
      playlist.totalDurationFormatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    playlist.updatedAt = new Date().toISOString();

    this.persist();
    return playlist;
  }

  public deletePlaylist(id: string): boolean {
    const lenBefore = this.data.playlists.length;
    this.data.playlists = this.data.playlists.filter((p) => p.id !== id);
    if (this.data.playlists.length !== lenBefore) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Stream Config & Persistence ---
  public getActiveConfig() {
    return this.data.activeConfig;
  }

  public setActiveConfig(config: (StreamConfig & { active: boolean; startedAt?: string }) | null) {
    this.data.activeConfig = config;
    this.persist();
  }

  // --- Stream History Operations ---
  public getHistory(): StreamSessionHistory[] {
    return [...this.data.history].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public addHistory(session: StreamSessionHistory) {
    this.data.history.unshift(session);
    // Keep max 200 history records
    if (this.data.history.length > 200) {
      this.data.history = this.data.history.slice(0, 200);
    }
    this.persist();
  }

  public clearHistory(): void {
    this.data.history = [];
    this.persist();
  }

  // --- Settings Operations ---
  public getSettings(): SystemSettings {
    return { ...this.data.settings };
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.persist();
    return this.data.settings;
  }
}

export const db = new Database();
export { DATA_DIR, UPLOAD_DIR, THUMBNAIL_DIR };
