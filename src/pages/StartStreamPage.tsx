import React, { useState, useEffect } from 'react';
import {
  PlaySquare,
  Radio,
  Eye,
  EyeOff,
  Repeat,
  Sparkles,
  Layers,
  Zap,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
  Film,
  Check,
  Clipboard,
  ShieldCheck,
} from 'lucide-react';
import { VideoItem, StreamConfig, StreamQuality, StreamBitrate, StreamFps } from '../types.js';
import { api } from '../services/api.js';
import { useStream } from '../context/StreamContext.js';
import { NavTab } from '../components/Sidebar.js';

interface StartStreamPageProps {
  initialVideo?: VideoItem | null;
  onNavigate: (tab: NavTab) => void;
}

export const StartStreamPage: React.FC<StartStreamPageProps> = ({
  initialVideo,
  onNavigate,
}) => {
  const { status, startStream, isActionPending, error: streamError, clearError } = useStream();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(initialVideo?.id || '');
  const [rtmpUrl, setRtmpUrl] = useState('rtmps://a.rtmps.youtube.com/live2');
  const [streamKey, setStreamKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loop, setLoop] = useState(true);
  const [quality, setQuality] = useState<StreamQuality>('1080p');
  const [bitrate, setBitrate] = useState<StreamBitrate>('4000k');
  const [customBitrate, setCustomBitrate] = useState('');
  const [fps, setFps] = useState<StreamFps>(30);
  const [audio, setAudio] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [copiedHint, setCopiedHint] = useState(false);

  useEffect(() => {
    const loadVideosAndSettings = async () => {
      try {
        const [videosRes, settingsRes] = await Promise.all([
          api.getVideos(),
          api.getSettings(),
        ]);
        setVideos(videosRes.videos || []);

        if (settingsRes.settings) {
          setRtmpUrl(settingsRes.settings.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2');
          setQuality(settingsRes.settings.defaultQuality || '1080p');
          setBitrate(settingsRes.settings.defaultBitrate || '4000k');
          setFps(settingsRes.settings.defaultFps || 30);
          setAutoReconnect(settingsRes.settings.autoReconnect ?? true);
        }

        if (initialVideo?.id) {
          setSelectedVideoId(initialVideo.id);
        } else if (videosRes.videos && videosRes.videos.length > 0 && !selectedVideoId) {
          setSelectedVideoId(videosRes.videos[0].id);
        }
      } catch (e) {
        console.error('Failed to load videos or settings:', e);
      } finally {
        setLoadingVideos(false);
      }
    };
    loadVideosAndSettings();
  }, [initialVideo]);

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setStreamKey(text.trim());
        setCopiedHint(true);
        setTimeout(() => setCopiedHint(false), 2000);
      }
    } catch (e) {
      alert('Clipboard permission denied. Please paste manually into the field.');
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!selectedVideoId) {
      setValidationError('Please select a video file from your library.');
      return;
    }

    if (!rtmpUrl.trim() || (!rtmpUrl.startsWith('rtmp://') && !rtmpUrl.startsWith('rtmps://'))) {
      setValidationError('Please provide a valid RTMP server URL (e.g. rtmp://a.rtmp.youtube.com/live2).');
      return;
    }

    if (!streamKey.trim()) {
      setValidationError('YouTube Stream Key is required.');
      return;
    }

    const finalBitrate = bitrate === 'custom' ? customBitrate.trim() || '4000k' : bitrate;

    const config: StreamConfig = {
      videoId: selectedVideoId,
      rtmpUrl: rtmpUrl.trim(),
      streamKey: streamKey.trim(),
      loop,
      quality,
      bitrate: finalBitrate,
      fps,
      audio,
      autoReconnect,
    };

    const success = await startStream(config);
    if (success) {
      onNavigate('active-stream');
    }
  };

  const isAlreadyStreaming = status?.active;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Existing stream warning banner */}
      {isAlreadyStreaming && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-amber-300">A stream is currently active on this server.</span>
              <p className="text-amber-200/80">Starting a new stream will require stopping the current one.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('active-stream')}
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
          >
            View Active Stream
          </button>
        </div>
      )}

      {/* Main Configuration Card */}
      <form onSubmit={handleStart} className="p-6 sm:p-8 rounded-3xl bg-[#111622] border border-zinc-800 shadow-xl space-y-8">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>24/7 RTMP Broadcast Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Launch YouTube RTMP Stream
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure your YouTube ingest endpoint, select your video asset, and let FFmpeg loop it continuously.
          </p>
        </div>

        {/* 1. Video Selection Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            1. Select Loop Video Asset <span className="text-rose-500">*</span>
          </label>

          {loadingVideos ? (
            <div className="p-4 bg-zinc-900 rounded-xl text-xs text-zinc-500">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-3">
              <Film className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-300 font-semibold">Your video library is empty</p>
              <button
                type="button"
                onClick={() => onNavigate('library')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Upload Video First
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <select
                  id="select-video-dropdown"
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="" disabled>
                    -- Choose video from library --
                  </option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.originalName} ({v.durationFormatted} • {v.resolution} • {v.fps}fps)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Video Card Preview */}
              {selectedVideo && (
                <div className="sm:col-span-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-32 aspect-video rounded-xl bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800 relative">
                    {selectedVideo.thumbnailUrl ? (
                      <img
                        src={selectedVideo.thumbnailUrl}
                        alt={selectedVideo.originalName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-6 h-6 text-zinc-700" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{selectedVideo.originalName}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Ready
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                      <span>Duration: <strong className="text-zinc-200">{selectedVideo.durationFormatted}</strong></span>
                      <span>•</span>
                      <span>Resolution: <strong className="text-zinc-200">{selectedVideo.resolution}</strong></span>
                      <span>•</span>
                      <span>FPS: <strong className="text-zinc-200">{selectedVideo.fps}</strong></span>
                      <span>•</span>
                      <span>Audio: <strong className="text-zinc-200">{selectedVideo.hasAudio ? 'Yes (AAC)' : 'Muted'}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. YouTube RTMP Destination */}
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            2. YouTube RTMP Destination <span className="text-rose-500">*</span>
          </label>

          <div className="space-y-3">
            {/* Server URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-zinc-400 font-medium">YouTube RTMP Server URL</span>
                <span className="text-[11px] text-zinc-500">Default YouTube Live Server</span>
              </div>
              <input
                id="input-rtmp-url"
                type="text"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmps://a.rtmps.youtube.com/live2"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Stream Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-zinc-400 font-medium">YouTube Stream Key</span>
                <span className="text-[11px] text-emerald-400/80 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Encrypted & Sanitized from Logs
                </span>
              </div>

              <div className="relative">
                <input
                  id="input-stream-key"
                  type={showKey ? 'text' : 'password'}
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                  className="w-full pl-4 pr-24 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePasteKey}
                    title="Paste from clipboard"
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors text-xs flex items-center gap-1"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">{copiedHint ? 'Pasted!' : 'Paste'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Stream Encoding Options */}
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            3. FFmpeg Encoding & Loop Parameters
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Infinite Loop Switch */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-indigo-400" />
                  <span>Loop Video 24/7</span>
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">Continuous seamless replay</p>
              </div>
              <button
                type="button"
                id="toggle-loop"
                onClick={() => setLoop(!loop)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  loop ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    loop ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quality Preset */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Stream Quality</span>
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                {(['1080p', '720p', 'source'] as StreamQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`py-1 rounded-lg text-xs font-semibold uppercase transition-colors ${
                      quality === q ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Bitrate Selector */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Target Bitrate</span>
              </span>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(e.target.value as StreamBitrate)}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto (Adaptive)</option>
                <option value="2500k">2500 kbps (720p Std)</option>
                <option value="4000k">4000 kbps (1080p Recommended)</option>
                <option value="6000k">6000 kbps (High Quality)</option>
                <option value="custom">Custom Bitrate</option>
              </select>
            </div>

            {/* FPS Selector */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-2">
              <span className="text-xs font-bold text-white">Frame Rate (FPS)</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                {(['source', 30, 60] as StreamFps[]).map((f) => (
                  <button
                    key={String(f)}
                    type="button"
                    onClick={() => setFps(f)}
                    className={`py-1 rounded-lg text-xs font-semibold transition-colors ${
                      fps === f ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f === 'source' ? 'Source' : `${f} FPS`}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Toggle */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {audio ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                  <span>Audio Stream</span>
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">Encode AAC Track</p>
              </div>
              <button
                type="button"
                id="toggle-audio"
                onClick={() => setAudio(!audio)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  audio ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    audio ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto Reconnect Switch */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  <span>Auto Reconnect</span>
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">Crash & network recovery</p>
              </div>
              <button
                type="button"
                id="toggle-reconnect"
                onClick={() => setAutoReconnect(!autoReconnect)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  autoReconnect ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoReconnect ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Validation or API Error Alerts */}
        {(validationError || streamError) && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError || streamError}</span>
          </div>
        )}

        {/* Submit Start Stream Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400">
            <p className="font-semibold text-zinc-300">24×7 Background Process</p>
            <p>Runs as a persistent server service. You can safely close your browser.</p>
          </div>

          <button
            type="submit"
            id="btn-submit-start-stream"
            disabled={isActionPending || videos.length === 0}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <PlaySquare className="w-5 h-5 fill-current" />
            <span>{isActionPending ? 'INITIALIZING FFMPEG...' : 'START 24/7 LIVE STREAM'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
