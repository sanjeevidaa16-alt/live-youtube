-- =========================================================================
-- CASTLOOP 24/7 STREAMING ENGINE - CORE SUPABASE POSTGRESQL SCHEMA
-- =========================================================================
-- Supabase = DATABASE (Metadata, Application Data, Configurations)
-- Cloudflare R2 = VIDEO STORAGE (Actual MP4/MKV video files remain in R2)
-- =========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. VIDEOS TABLE (Metadata only - Binary video files remain in Cloudflare R2)
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name TEXT NOT NULL,
    stored_name TEXT,
    r2_object_key TEXT NOT NULL,
    r2_bucket TEXT,
    mime_type TEXT DEFAULT 'video/mp4',
    file_size BIGINT DEFAULT 0,
    duration NUMERIC DEFAULT 0,
    width INTEGER DEFAULT 1920,
    height INTEGER DEFAULT 1080,
    fps NUMERIC DEFAULT 30,
    codec TEXT DEFAULT 'h264',
    audio_codec TEXT DEFAULT 'aac',
    has_audio BOOLEAN DEFAULT TRUE,
    bitrate BIGINT,
    thumbnail_key TEXT,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'READY', -- READY, PROCESSING, ERROR
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PLAYLISTS TABLE
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE',
    total_duration NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PLAYLIST VIDEOS TABLE (Ordered relationship between playlists and videos)
CREATE TABLE IF NOT EXISTS public.playlist_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. STREAMS TABLE (Multi-stream instances & 24/7 broadcast configurations)
CREATE TABLE IF NOT EXISTS public.streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_name TEXT,
    name TEXT NOT NULL,
    rtmp_url TEXT NOT NULL DEFAULT 'rtmps://a.rtmps.youtube.com/live2',
    stream_key TEXT,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
    playlist_name TEXT,
    current_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    video_title TEXT,
    loop BOOLEAN NOT NULL DEFAULT TRUE,
    quality TEXT DEFAULT '1080p',
    bitrate TEXT DEFAULT '4000k',
    fps NUMERIC DEFAULT 30,
    audio BOOLEAN NOT NULL DEFAULT TRUE,
    auto_reconnect BOOLEAN NOT NULL DEFAULT TRUE,
    reconnect_delay_seconds INTEGER DEFAULT 5,
    max_reconnect_attempts INTEGER DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'STOPPED', -- STOPPED, STARTING, LIVE, RECONNECTING, STOPPING, ERROR
    ffmpeg_pid BIGINT,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    uptime_seconds BIGINT DEFAULT 0,
    uptime_formatted TEXT DEFAULT '00:00:00',
    reconnect_count INTEGER DEFAULT 0,
    current_loop_count INTEGER DEFAULT 1,
    last_error TEXT,
    last_log_line TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. STREAM VIDEOS TABLE (Optional explicit ordering for stream item queue)
CREATE TABLE IF NOT EXISTS public.stream_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. STREAM LOGS TABLE (Operational logs - START, STOP, ERROR, RECONNECT, FFMPEG_EXIT)
CREATE TABLE IF NOT EXISTS public.stream_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID REFERENCES public.streams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- START, STOP, ERROR, RECONNECT, FFMPEG_EXIT, UPLOAD, PROCESSING
    level TEXT DEFAULT 'info', -- info, warn, error, stats
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. SYSTEM SETTINGS TABLE (Application settings and configuration key-values)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos (status);
CREATE INDEX IF NOT EXISTS idx_videos_r2_object_key ON public.videos (r2_object_key);

CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON public.playlists (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id ON public.playlist_videos (playlist_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_playlist_videos_video_id ON public.playlist_videos (video_id);

CREATE INDEX IF NOT EXISTS idx_streams_status ON public.streams (status);
CREATE INDEX IF NOT EXISTS idx_streams_playlist_id ON public.streams (playlist_id);
CREATE INDEX IF NOT EXISTS idx_streams_created_at ON public.streams (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stream_logs_stream_id ON public.stream_logs (stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_logs_created_at ON public.stream_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_logs_event_type ON public.stream_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings (setting_key);

-- =========================================================================
-- ROW LEVEL SECURITY POLICIES (Backend Service Role + Controlled Public Access)
-- =========================================================================
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access for backend API service role
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on videos') THEN
        CREATE POLICY "Allow service_role full access on videos" ON public.videos FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on playlists') THEN
        CREATE POLICY "Allow service_role full access on playlists" ON public.playlists FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on playlist_videos') THEN
        CREATE POLICY "Allow service_role full access on playlist_videos" ON public.playlist_videos FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on streams') THEN
        CREATE POLICY "Allow service_role full access on streams" ON public.streams FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on stream_videos') THEN
        CREATE POLICY "Allow service_role full access on stream_videos" ON public.stream_videos FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on stream_logs') THEN
        CREATE POLICY "Allow service_role full access on stream_logs" ON public.stream_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access on system_settings') THEN
        CREATE POLICY "Allow service_role full access on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
