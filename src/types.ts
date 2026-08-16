export type StreamState = 
  | 'IDLE' 
  | 'STARTING' 
  | 'LIVE' 
  | 'STOPPING' 
  | 'STOPPED' 
  | 'ERROR' 
  | 'RECONNECTING';

export type StreamQuality = 'source' | '720p' | '1080p';
export type StreamBitrate = 'auto' | '2500k' | '4000k' | '6000k' | string;
export type StreamFps = 'source' | 30 | 60;

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  googleId?: string;
  role: UserRole;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  originalName: string;
  storedName: string;
  filename: string;
  path: string;
  thumbnailUrl: string;
  size: number;
  duration: number; // in seconds
  durationFormatted: string;
  width: number;
  height: number;
  resolution: string;
  fps: number;
  codec: string;
  audioCodec?: string;
  hasAudio: boolean;
  bitrate?: number;
  source?: 'upload' | 'r2' | 'sample';
  r2ObjectKey?: string;
  r2Bucket?: string;
  storageProvider?: 'cloudflare_r2' | 'vps';
  createdAt: string;
  updatedAt?: string;
}

export interface PlaylistItem {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  totalDuration?: number;
  totalDurationFormatted?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamConfig {
  videoId?: string;
  playlistId?: string;
  videoIds?: string[];
  playlistName?: string;
  rtmpUrl?: string;
  streamKey?: string;
  loop?: boolean;
  quality?: StreamQuality;
  resolution?: StreamQuality;
  bitrate?: StreamBitrate;
  videoBitrate?: StreamBitrate;
  fps?: StreamFps;
  audio?: boolean;
  audioEnabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelaySeconds?: number;
  maxReconnectAttempts?: number;
}

export interface StreamInstance {
  id: string;
  userId: string;
  userName?: string;
  name: string;
  rtmpUrl: string;
  streamKey?: string;
  maskedStreamKey?: string;
  playlistId?: string;
  playlistName?: string;
  videoId?: string;
  videoTitle?: string;
  videoIds?: string[];
  loop?: boolean;
  quality?: StreamQuality;
  bitrate?: StreamBitrate;
  fps?: StreamFps;
  audio?: boolean;
  autoReconnect?: boolean;
  reconnectDelaySeconds?: number;
  maxReconnectAttempts?: number;
  status: StreamState;
  ffmpegPid?: number;
  startedAt?: string;
  stoppedAt?: string;
  uptimeSeconds?: number;
  uptimeFormatted?: string;
  reconnectCount?: number;
  currentLoopCount?: number;
  lastError?: string;
  lastLogLine?: string;
  encoderStats?: {
    frame: number;
    fps: number;
    q: number;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StreamStatusInfo {
  status: StreamState;
  active: boolean;
  videoId?: string;
  videoTitle?: string;
  playlistId?: string;
  playlistName?: string;
  videoIds?: string[];
  videoDuration?: number;
  rtmpUrl?: string;
  maskedStreamKey?: string;
  loop: boolean;
  quality: StreamQuality;
  resolution?: StreamQuality;
  bitrate: StreamBitrate;
  videoBitrate?: StreamBitrate;
  fps: StreamFps;
  hasAudio: boolean;
  autoReconnect: boolean;
  currentConfig?: StreamConfig;
  pid?: number;
  startedAt?: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  reconnectCount: number;
  currentLoopCount: number;
  errorMessage?: string;
  lastLogLine?: string;
  encoderStats?: {
    frame: number;
    fps: number;
    q: number;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
  };
  cpuPercent?: number;
  memoryMb?: number;
}

export interface StreamSessionHistory {
  id: string;
  videoId: string;
  videoName: string;
  startedAt: string;
  stoppedAt: string;
  durationSeconds: number;
  durationFormatted: string;
  status: 'SUCCESS' | 'STOPPED' | 'CRASHED' | 'RECONNECTED' | 'ERROR';
  reconnectCount: number;
  errorMessage?: string;
  rtmpUrl: string;
}

export interface R2StorageDiagnostics {
  credentialsLoaded?: boolean;
  endpointReachable?: boolean;
  bucketAccessible?: boolean;
  writePermission?: boolean;
  readPermission?: boolean;
  deletePermission?: boolean;
}

export interface R2StorageConfig {
  storageProvider: 'cloudflare_r2';
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string; // Masked on client side
  bucketName?: string;
  publicUrl?: string; // Optional custom domain / R2 public URL
  maxStorageGb?: number;
  maxVideoSizeGb?: number;
  lastTestedAt?: string;
  lastTestStatus?: 'connected' | 'error' | 'untested';
  lastTestMessage?: string;
  diagnostics?: R2StorageDiagnostics;
  storageUsedBytes?: number;
  objectCount?: number;
}

export interface StorageTestResult {
  success: boolean;
  connected: boolean;
  storageProvider: 'cloudflare_r2';
  accountId?: string;
  bucketName?: string;
  message?: string;
  error?: string;
  diagnostics?: R2StorageDiagnostics;
  storageUsedBytes?: number;
  objectCount?: number;
  testedAt: string;
}

export interface DatabaseDiagnostics {
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  endpointReachable: boolean;
  authSuccess: boolean;
  tablesVerified: boolean;
  connected?: boolean;
  message: string;
  tableDetails?: {
    videos?: boolean;
    playlists?: boolean;
    streams?: boolean;
    stream_logs?: boolean;
    system_settings?: boolean;
  };
  tables?: Record<string, boolean>;
  recordCounts?: Record<string, number>;
}

export interface DatabaseConfig {
  databaseProvider: 'supabase' | 'supabase_postgres';
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string; // Masked on client side
  configured?: boolean;
  isConfigured?: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'connected' | 'error' | 'untested';
  lastTestMessage?: string;
  diagnostics?: DatabaseDiagnostics;
}

export interface DatabaseTestResult {
  success: boolean;
  connected: boolean;
  databaseProvider?: 'supabase' | 'supabase_postgres';
  message?: string;
  error?: string;
  latencyMs?: number;
  tables?: Record<string, boolean>;
  recordCounts?: Record<string, number>;
  diagnostics?: DatabaseDiagnostics;
  testedAt: string;
}

export interface SystemSettings {
  defaultRtmpUrl: string;
  defaultStreamKey?: string;
  defaultQuality: StreamQuality;
  defaultBitrate: StreamBitrate;
  defaultFps: StreamFps;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  autoRestartOnServerBoot: boolean;
  maxConcurrentStreams?: number;
  r2?: R2StorageConfig;
  database?: DatabaseConfig;
}

export interface SystemStatus {
  ffmpegInstalled: boolean;
  ffmpegVersion?: string;
  ffmpegPath?: string;
  ffprobeInstalled: boolean;
  ffprobeVersion?: string;
  ffprobePath?: string;
  streamingEngineReady: boolean;
  cpuUsagePercent: number;
  cpuModel?: string;
  cpuCores?: number;
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usagePercent: number;
  };
  disk: {
    totalGb?: number;
    freeGb?: number;
    usedGb?: number;
    uploadDirSizeMb: number;
  };
  nodeUptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  activeStreamRunning: boolean;
  totalVideosCount: number;
}

export interface FFmpegLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'stats';
  message: string;
}

export interface StreamDiagnostics {
  ffmpegInstalled: boolean;
  ffmpegVersion?: string;
  ffprobeInstalled: boolean;
  ffprobeVersion?: string;
  uploadDirWritable: boolean;
  videoValid: boolean;
  videoMetadata?: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
    hasAudio: boolean;
    audioCodec?: string;
    bitrate?: number;
  };
  videoError?: string;
  rtmpValid: boolean;
  currentProcessRunning: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
