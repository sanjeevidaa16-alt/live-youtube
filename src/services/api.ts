import {
  AuthResponse,
  StreamConfig,
  StreamSessionHistory,
  StreamStatusInfo,
  SystemSettings,
  SystemStatus,
  User,
  VideoItem,
  FFmpegLogEntry,
} from '../types.js';

const TOKEN_KEY = 'castloop_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}, maxRetries = 4): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let attempt = 0;
  while (true) {
    attempt++;
    let response: Response | null = null;
    let fetchError: Error | null = null;

    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (err: any) {
      fetchError = err;
    }

    // If network fetch failed (connection drop/proxy reset)
    if (!response || fetchError) {
      if (attempt < maxRetries) {
        const delay = Math.min(6000, 800 * Math.pow(1.6, attempt - 1) + Math.random() * 400);
        console.warn(`[API] Network error on ${endpoint}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error('Unable to connect to server. Please check your network connection.');
    }

    // Intercept transient proxy errors (503 Service Unavailable, 502 Bad Gateway, 504 Gateway Timeout, 429, 408)
    if ([502, 503, 504, 429, 408].includes(response.status)) {
      if (attempt < maxRetries) {
        const delay = Math.min(8000, 1000 * Math.pow(1.8, attempt - 1) + Math.random() * 500);
        console.warn(`[API] Server returned HTTP ${response.status} on ${endpoint}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Server temporarily unavailable (HTTP ${response.status}). Please try again in a few moments.`);
    }

    const rawText = await response.text();
    let data: any = {};
    let parseFailed = false;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      parseFailed = true;
    }

    if (response.status === 401) {
      if (endpoint === '/api/auth/me') {
        clearStoredToken();
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new Error('Session expired or unauthorized. Please log in again.');
      }
      if (endpoint.includes('/api/auth/login')) {
        throw new Error(data.error || data.message || 'Invalid email/username or password.');
      }
      throw new Error(data.error || data.message || 'Unauthorized access. Please log in again.');
    }

    if (parseFailed) {
      // If server returned non-JSON (e.g. HTML proxy error page during restart or load spike)
      if (attempt < maxRetries) {
        const delay = Math.min(6000, 800 * Math.pow(1.5, attempt - 1) + Math.random() * 400);
        console.warn(`[API] Unexpected response format from ${endpoint}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Request entity is too large for the server.');
        }
        throw new Error(`Server returned HTTP ${response.status}: ${rawText.slice(0, 80) || response.statusText}`);
      }
      throw new Error('Received unexpected response format from server.');
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error ${response.status}`);
    }

    return data as T;
  }
}

export const api = {
  // Auth
  signup: (params: { username: string; email: string; password: string; name?: string }) =>
    request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  syncFirebaseUser: (profile: {
    uid: string;
    email: string;
    username: string;
    name?: string;
    avatar?: string;
    authProvider?: 'google' | 'password';
  }) =>
    request<AuthResponse>('/api/auth/firebase-sync', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  loginWithGoogle: (googleProfile: { email: string; name?: string; avatar?: string; googleId?: string }) =>
    request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleProfile),
    }),
  adminLogin: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getUsers: () => request<{ users: User[] }>('/api/auth/users'),
  deleteUser: (id: string) => request<{ success: boolean }>('/api/auth/users/' + id, { method: 'DELETE' }),
  getMe: () => request<{ user: User }>('/api/auth/me'),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Playlists
  getPlaylists: () => request<{ playlists: import('../types.js').PlaylistItem[] }>('/api/playlists'),
  getPlaylist: (id: string) =>
    request<{ playlist: import('../types.js').PlaylistItem; videos: VideoItem[] }>(`/api/playlists/${id}`),
  createPlaylist: (name: string, videoIds: string[] = [], description?: string) =>
    request<{ success: boolean; playlist: import('../types.js').PlaylistItem }>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, videoIds, description }),
    }),
  updatePlaylist: (id: string, updates: Partial<{ name: string; description: string; videoIds: string[] }>) =>
    request<{ success: boolean; playlist: import('../types.js').PlaylistItem }>(`/api/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deletePlaylist: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/playlists/${id}`, {
      method: 'DELETE',
    }),

  // Google Drive
  importGDriveVideo: (data: { url?: string; fileId?: string; title?: string }) =>
    request<{ success: boolean; message: string; video: VideoItem }>('/api/videos/gdrive-import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Videos
  getVideos: () => request<{ videos: VideoItem[] }>('/api/videos'),
  getVideo: (id: string) => request<{ video: VideoItem }>(`/api/videos/${id}`),
  updateVideoName: (id: string, originalName: string) =>
    request<{ success: boolean; video: VideoItem }>(`/api/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ originalName }),
    }),
  deleteVideo: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/videos/${id}`, {
      method: 'DELETE',
    }),
  uploadVideo: async (
    file: File,
    title?: string,
    onProgress?: (percent: number, statusText?: string) => void
  ): Promise<{ success: boolean; video: VideoItem }> => {
    // Use 4MB slice chunks so every single request easily stays below proxy payload limits
    const CHUNK_SIZE = 4 * 1024 * 1024;
    const totalSize = file.size;
    const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

    if (onProgress) {
      onProgress(0, `Initializing VPS upload for ${file.name}...`);
    }

    // Step 1: Initialize chunked upload session
    const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;
    const initRes = await request<{
      success: boolean;
      uploadId: string;
      chunkSize: number;
      totalChunks: number;
      completedChunks: number[];
    }>('/api/videos/upload/init', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        totalChunks,
        totalSize,
        fingerprint,
      }),
    });

    const uploadId = initRes.uploadId;
    const completedSet = new Set(initRes.completedChunks || []);
    let uploadedBytes = Array.from(completedSet).reduce((sum, idx) => {
      const start = idx * CHUNK_SIZE;
      const end = Math.min(totalSize, start + CHUNK_SIZE);
      return sum + (end - start);
    }, 0);

    const token = getStoredToken();

    // Step 2: Upload each slice sequentially with retry resilience
    for (let i = 0; i < totalChunks; i++) {
      if (completedSet.has(i)) {
        continue;
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(totalSize, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      let chunkUploaded = false;
      let lastChunkErr: any = null;

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await new Promise<void>((resolveChunk, rejectChunk) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('uploadId', uploadId);
            formData.append('chunkIndex', String(i));
            formData.append('chunk', chunkBlob, `chunk_${i}.part`);

            xhr.open('POST', '/api/videos/upload/chunk');
            xhr.timeout = 3 * 60 * 1000; // 3 minutes per 4MB chunk

            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.setRequestHeader('x-upload-id', uploadId);
            xhr.setRequestHeader('x-chunk-index', String(i));

            let previousLoadedInThisChunk = 0;
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && onProgress) {
                const currentChunkLoaded = event.loaded;
                const delta = currentChunkLoaded - previousLoadedInThisChunk;
                previousLoadedInThisChunk = currentChunkLoaded;
                uploadedBytes += delta;

                const currentPercent = Math.min(99, Math.round((uploadedBytes / totalSize) * 100));
                onProgress(currentPercent, `Uploading ${file.name}... ${currentPercent}% (${i + 1}/${totalChunks})`);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolveChunk();
              } else {
                rejectChunk(new Error(`Chunk upload failed with HTTP ${xhr.status}`));
              }
            };

            xhr.onerror = () => rejectChunk(new Error('Network connection error during chunk upload'));
            xhr.ontimeout = () => rejectChunk(new Error('Timeout during chunk upload'));
            xhr.send(formData);
          });

          chunkUploaded = true;
          completedSet.add(i);
          break;
        } catch (err: any) {
          lastChunkErr = err;
          const backoff = Math.min(5000, 800 * Math.pow(1.5, attempt) + Math.random() * 400);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      if (!chunkUploaded) {
        throw new Error(
          `Failed to upload part ${i + 1} of ${totalChunks}: ${lastChunkErr?.message || 'Network error'}. Please try again.`
        );
      }
    }

    // Step 3: Complete & assemble on VPS storage
    if (onProgress) {
      onProgress(99, 'Assembling & processing video on VPS storage...');
    }

    const completeRes = await request<{ success: boolean; video: VideoItem; message?: string }>(
      '/api/videos/upload/complete',
      {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          filename: file.name,
          totalChunks,
          title: title?.trim() || file.name,
        }),
      },
      6
    );

    if (onProgress) {
      onProgress(100, 'Upload complete.');
    }

    return {
      success: true,
      video: completeRes.video,
    };
  },

  // Multi-Stream Instances
  getStreams: () => request<{ success: boolean; streams: import('../types.js').StreamInstance[] }>('/api/streams'),
  getStream: (id: string) =>
    request<{ success: boolean; stream: import('../types.js').StreamInstance }>(`/api/streams/${id}`),
  createStream: (data: Partial<import('../types.js').StreamInstance>) =>
    request<{ success: boolean; stream: import('../types.js').StreamInstance; message: string }>('/api/streams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStream: (id: string, data: Partial<import('../types.js').StreamInstance>) =>
    request<{ success: boolean; stream: import('../types.js').StreamInstance; message: string }>(`/api/streams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStream: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/streams/${id}`, {
      method: 'DELETE',
    }),
  startStreamInstance: (id: string, config?: any) =>
    request<{ success: boolean; message: string; stream: import('../types.js').StreamInstance; sessionId?: string }>(
      `/api/streams/${id}/start`,
      {
        method: 'POST',
        body: JSON.stringify(config || {}),
      }
    ),
  stopStreamInstance: (id: string) =>
    request<{ success: boolean; message: string; stream?: import('../types.js').StreamInstance }>(
      `/api/streams/${id}/stop`,
      {
        method: 'POST',
      }
    ),
  restartStreamInstance: (id: string) =>
    request<{ success: boolean; message: string; stream?: import('../types.js').StreamInstance }>(
      `/api/streams/${id}/restart`,
      {
        method: 'POST',
      }
    ),
  getStreamInstanceLogs: (id: string) =>
    request<{ success: boolean; logs: FFmpegLogEntry[] }>(`/api/streams/${id}/logs`),
  clearStreamInstanceLogs: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/streams/${id}/logs`, {
      method: 'DELETE',
    }),

  // Stream (Legacy & Consolidated)
  startStream: (config: Partial<StreamConfig> = {}) =>
    request<{ success: boolean; message: string; status: StreamStatusInfo; sessionId?: string }>('/api/stream/start', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  stopStream: () =>
    request<{ success: boolean; message: string; status: StreamStatusInfo }>('/api/stream/stop', {
      method: 'POST',
    }),
  restartStream: () =>
    request<{ success: boolean; message: string; status: StreamStatusInfo }>('/api/stream/restart', {
      method: 'POST',
    }),
  getStreamStatus: () => request<{ status: StreamStatusInfo }>('/api/stream/status'),
  getDiagnostics: (videoId?: string) =>
    request<{ diagnostics: import('../types.js').StreamDiagnostics }>(
      videoId ? `/api/stream/diagnostics?videoId=${encodeURIComponent(videoId)}` : '/api/stream/diagnostics'
    ),
  getHealth: () =>
    request<{ server: string; ffmpeg: string; ffprobe: string; streamingEngine: string; status: string }>(
      '/api/health'
    ),
  getLogs: () => request<{ logs: FFmpegLogEntry[] }>('/api/stream/logs'),
  clearLogs: () => request<{ success: boolean }>('/api/stream/logs', { method: 'DELETE' }),
  getHistory: () => request<{ history: StreamSessionHistory[] }>('/api/stream/history'),
  clearHistory: () => request<{ success: boolean }>('/api/stream/history', { method: 'DELETE' }),

  // Settings
  getSettings: () => request<{ settings: SystemSettings }>('/api/settings'),
  updateSettings: (settings: Partial<SystemSettings>) =>
    request<{ success: boolean; settings: SystemSettings; message: string }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // System
  getSystemStatus: () => request<{ status: SystemStatus }>('/api/system/status'),
};
