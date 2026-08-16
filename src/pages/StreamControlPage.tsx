import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import {
  StreamInstance,
  VideoItem,
  PlaylistItem,
  FFmpegLogEntry,
  SystemSettings,
} from '../types.js';
import {
  Radio,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Activity,
  Cpu,
  Clock,
  Settings,
  Film,
  ListVideo,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Maximize2,
  Trash2,
  Plus,
  Edit3,
  Copy,
  Check,
  Zap,
  Layers,
  HelpCircle,
  Shield,
  Loader2,
  Tv,
} from 'lucide-react';

export const StreamControlPage: React.FC = () => {
  const [streams, setStreams] = useState<StreamInstance[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State: Create / Edit Stream
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRtmpUrl, setFormRtmpUrl] = useState('rtmps://a.rtmps.youtube.com/live2');
  const [formStreamKey, setFormStreamKey] = useState('');
  const [formSourceType, setFormSourceType] = useState<'video' | 'playlist'>('video');
  const [formVideoId, setFormVideoId] = useState('');
  const [formPlaylistId, setFormPlaylistId] = useState('');
  const [formQuality, setFormQuality] = useState('1080p');
  const [formBitrate, setFormBitrate] = useState('4000k');
  const [formFps, setFormFps] = useState(30);
  const [formAudio, setFormAudio] = useState(true);
  const [formAutoReconnect, setFormAutoReconnect] = useState(true);
  const [showKeyInModal, setShowKeyInModal] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  // Modal State: Terminal Logs
  const [terminalStream, setTerminalStream] = useState<StreamInstance | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<FFmpegLogEntry[]>([]);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Modal State: Delete Confirmation
  const [deleteStreamTarget, setDeleteStreamTarget] = useState<StreamInstance | null>(null);
  const [isDeletingStream, setIsDeletingStream] = useState(false);

  // Action Loading tracking per stream: streamId -> action
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      const [streamsRes, videosRes, playlistsRes, settingsRes] = await Promise.allSettled([
        api.getStreams(),
        api.getVideos(),
        api.getPlaylists(),
        api.getSettings(),
      ]);

      if (streamsRes.status === 'fulfilled') {
        setStreams(streamsRes.value.streams || []);
      }
      if (videosRes.status === 'fulfilled') {
        setVideos(videosRes.value.videos || []);
      }
      if (playlistsRes.status === 'fulfilled') {
        setPlaylists(playlistsRes.value.playlists || []);
      }
      if (settingsRes.status === 'fulfilled') {
        setSettings(settingsRes.value.settings);
      }
    } catch (e) {
      console.error('Error fetching stream center data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 2500);
    return () => clearInterval(interval);
  }, []);

  // Poll terminal logs when terminal modal is open
  useEffect(() => {
    if (!terminalStream) return;
    const fetchLogs = async () => {
      try {
        const res = await api.getStreamInstanceLogs(terminalStream.id);
        setTerminalLogs(res.logs || []);
      } catch (e) {}
    };

    fetchLogs();
    const logInterval = setInterval(fetchLogs, 1500);
    return () => clearInterval(logInterval);
  }, [terminalStream]);

  useEffect(() => {
    if (autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [terminalLogs, autoScrollLogs]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingStreamId(null);
    setFormName(`Live Stream #${streams.length + 1}`);
    setFormRtmpUrl(settings?.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2');
    setFormStreamKey(settings?.defaultStreamKey || '');
    setFormSourceType('video');
    setFormVideoId(videos.length > 0 ? videos[0].id : '');
    setFormPlaylistId(playlists.length > 0 ? playlists[0].id : '');
    setFormQuality(settings?.defaultQuality || '1080p');
    setFormBitrate(settings?.defaultBitrate || '4000k');
    setFormFps(settings?.defaultFps || 30);
    setFormAudio(true);
    setFormAutoReconnect(true);
    setShowKeyInModal(false);
    setStreamModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (stream: StreamInstance) => {
    setEditingStreamId(stream.id);
    setFormName(stream.name);
    setFormRtmpUrl(stream.rtmpUrl);
    setFormStreamKey(stream.streamKey || '');
    if (stream.playlistId) {
      setFormSourceType('playlist');
      setFormPlaylistId(stream.playlistId);
      setFormVideoId('');
    } else {
      setFormSourceType('video');
      setFormVideoId(stream.videoId || (videos.length > 0 ? videos[0].id : ''));
      setFormPlaylistId('');
    }
    setFormQuality(stream.quality || '1080p');
    setFormBitrate(stream.bitrate || '4000k');
    setFormFps(typeof stream.fps === 'number' ? stream.fps : 30);
    setFormAudio(stream.audio !== false);
    setFormAutoReconnect(stream.autoReconnect !== false);
    setShowKeyInModal(false);
    setStreamModalOpen(true);
  };

  // Save Stream Instance (Create or Update)
  const handleSaveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Stream name is required.');
      return;
    }

    setModalSaving(true);
    setErrorMsg(null);

    const payload: Partial<StreamInstance> = {
      name: formName.trim(),
      rtmpUrl: formRtmpUrl.trim(),
      streamKey: formStreamKey.trim(),
      videoId: formSourceType === 'video' ? formVideoId : undefined,
      playlistId: formSourceType === 'playlist' ? formPlaylistId : undefined,
      quality: formQuality as any,
      bitrate: formBitrate as any,
      fps: Number(formFps) as any,
      audio: formAudio,
      autoReconnect: formAutoReconnect,
    };

    try {
      if (editingStreamId) {
        await api.updateStream(editingStreamId, payload);
        setSuccessMsg(`Stream "${formName}" updated successfully.`);
      } else {
        await api.createStream(payload);
        setSuccessMsg(`Stream "${formName}" created. Click START to begin broadcasting.`);
      }
      setStreamModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save stream configuration.');
    } finally {
      setModalSaving(false);
    }
  };

  // Start Stream Instance
  const handleStartStream = async (stream: StreamInstance) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLoadingMap((prev) => ({ ...prev, [stream.id]: 'start' }));

    try {
      await api.startStreamInstance(stream.id);
      setSuccessMsg(`Stream "${stream.name}" initiated. Connecting to YouTube RTMP...`);
      await fetchAllData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to start stream "${stream.name}".`);
    } finally {
      setActionLoadingMap((prev) => {
        const next = { ...prev };
        delete next[stream.id];
        return next;
      });
    }
  };

  // Stop Stream Instance
  const handleStopStream = async (stream: StreamInstance) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLoadingMap((prev) => ({ ...prev, [stream.id]: 'stop' }));

    try {
      await api.stopStreamInstance(stream.id);
      setSuccessMsg(`Stream "${stream.name}" stopped.`);
      await fetchAllData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to stop stream "${stream.name}".`);
    } finally {
      setActionLoadingMap((prev) => {
        const next = { ...prev };
        delete next[stream.id];
        return next;
      });
    }
  };

  // Restart Stream Instance
  const handleRestartStream = async (stream: StreamInstance) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLoadingMap((prev) => ({ ...prev, [stream.id]: 'restart' }));

    try {
      await api.restartStreamInstance(stream.id);
      setSuccessMsg(`Stream "${stream.name}" restarted.`);
      await fetchAllData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to restart stream "${stream.name}".`);
    } finally {
      setActionLoadingMap((prev) => {
        const next = { ...prev };
        delete next[stream.id];
        return next;
      });
    }
  };

  // Delete Stream Instance
  const handleConfirmDeleteStream = async () => {
    if (!deleteStreamTarget || isDeletingStream) return;
    setIsDeletingStream(true);
    setErrorMsg(null);

    try {
      await api.deleteStream(deleteStreamTarget.id);
      setStreams((prev) => prev.filter((s) => s.id !== deleteStreamTarget.id));
      setSuccessMsg(`Stream "${deleteStreamTarget.name}" deleted.`);
      setDeleteStreamTarget(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete stream configuration.');
    } finally {
      setIsDeletingStream(false);
    }
  };

  const handleCopyKey = (stream: StreamInstance) => {
    if (stream.streamKey) {
      navigator.clipboard.writeText(stream.streamKey);
      setCopiedKeyId(stream.id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  const activeCount = streams.filter(
    (s) => s.status === 'LIVE' || s.status === 'STARTING' || s.status === 'RECONNECTING'
  ).length;
  const maxStreams = settings?.maxConcurrentStreams || 5;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner / Live Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#140a0e] via-[#0d0d12] to-[#0a0a0c] border border-red-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            Simultaneous Multi-Stream Manager
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Live Stream Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Run and monitor multiple simultaneous 24/7 RTMP streams to different YouTube channels. Streams operate completely independently with isolated FFmpeg processes.
          </p>
        </div>

        {/* Status Badge & Create Button */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="px-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
            <div className="text-xs">
              <span className="font-bold text-white">{activeCount}</span>
              <span className="text-slate-400"> / {maxStreams} Active Streams</span>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Live Stream</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Streams List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading active stream instances from VPS...
        </div>
      ) : streams.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0e0e12] border border-white/[0.08] space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center">
            <Radio className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No live streams created yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Set up your first 24/7 RTMP stream configuration with your YouTube Stream Key and media source.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="py-2.5 px-6 rounded-full bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              Create Stream #1
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {streams.map((stream) => {
            const isLive = stream.status === 'LIVE';
            const isStarting = stream.status === 'STARTING';
            const isReconnecting = stream.status === 'RECONNECTING';
            const isActionBusy = !!actionLoadingMap[stream.id];
            const isKeyRevealed = revealedKeys[stream.id];

            return (
              <div
                key={stream.id}
                className={`p-6 rounded-3xl bg-[#0e0e12] border transition-all duration-300 relative flex flex-col justify-between ${
                  isLive
                    ? 'border-red-500/60 shadow-[0_0_30px_rgba(255,26,26,0.15)] ring-1 ring-red-500/30'
                    : 'border-white/[0.08] hover:border-white/20 shadow-xl'
                }`}
              >
                <div>
                  {/* Top Bar: Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isLive
                              ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(255,26,26,0.5)]'
                              : isStarting
                              ? 'bg-amber-500 text-black'
                              : isReconnecting
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLive ? 'bg-white animate-ping' : isStarting ? 'bg-black' : 'bg-slate-500'
                            }`}
                          />
                          {stream.status}
                        </span>

                        {stream.ffmpegPid && (
                          <span className="text-[10px] font-mono text-slate-500">
                            PID {stream.ffmpegPid}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-white tracking-tight">{stream.name}</h2>
                    </div>

                    {/* Top Right Action Icons: Edit / Terminal / Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTerminalStream(stream)}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="View Live FFmpeg Terminal Logs"
                      >
                        <Terminal className="w-4 h-4 text-emerald-400" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(stream)}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Edit Stream Settings"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteStreamTarget(stream)}
                        disabled={isLive || isStarting || isReconnecting}
                        className="p-2 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-200 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isLive ? 'Stop stream before deleting' : 'Delete Stream'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stream Destination & Media Info */}
                  <div className="space-y-2.5 p-4 rounded-2xl bg-black/40 border border-white/[0.04] text-xs">
                    {/* Media Source */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        {stream.playlistId ? <ListVideo className="w-3.5 h-3.5 text-red-400" /> : <Film className="w-3.5 h-3.5 text-red-400" />}
                        Media Source:
                      </span>
                      <span className="font-semibold text-white truncate max-w-[200px]" title={stream.playlistName || stream.videoTitle || 'No media assigned'}>
                        {stream.playlistName || stream.videoTitle || 'Auto First Available Video'}
                      </span>
                    </div>

                    {/* RTMP Target */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-slate-400" />
                        RTMP Target:
                      </span>
                      <span className="font-mono text-[11px] text-slate-300 truncate max-w-[200px]" title={stream.rtmpUrl}>
                        {stream.rtmpUrl}
                      </span>
                    </div>

                    {/* Stream Key with Reveal / Copy */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        Stream Key:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-300">
                          {isKeyRevealed && stream.streamKey ? stream.streamKey : (stream.maskedStreamKey || '••••••••')}
                        </span>
                        {stream.streamKey && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedKeys((prev) => ({ ...prev, [stream.id]: !prev[stream.id] }))
                              }
                              className="text-slate-400 hover:text-white p-1 cursor-pointer"
                              title={isKeyRevealed ? 'Hide Stream Key' : 'Reveal Stream Key'}
                            >
                              {isKeyRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(stream)}
                              className="text-slate-400 hover:text-white p-1 cursor-pointer"
                              title="Copy Stream Key"
                            >
                              {copiedKeyId === stream.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Specs Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-300">
                        {stream.quality || '1080p'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-300">
                        {stream.bitrate || '4000k'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-300">
                        {stream.fps || 30} FPS
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-300">
                        {stream.audio !== false ? 'Audio AAC' : 'Muted'}
                      </span>
                    </div>
                  </div>

                  {/* Live Telemetry (When Running) */}
                  <div className="grid grid-cols-3 gap-2 my-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-red-400" />
                        Uptime
                      </div>
                      <div className="text-xs font-black font-mono text-white mt-1">
                        {stream.uptimeFormatted || '00:00:00'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        Speed / FPS
                      </div>
                      <div className="text-xs font-black font-mono text-white mt-1">
                        {stream.encoderStats?.fps ? `${stream.encoderStats.fps} fps` : isLive ? '60.0 fps' : '0.0 fps'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        Bitrate
                      </div>
                      <div className="text-xs font-black font-mono text-white mt-1">
                        {stream.encoderStats?.bitrate || (isLive ? stream.bitrate || '4000k' : '0k')}
                      </div>
                    </div>
                  </div>

                  {/* Last Error Banner if any */}
                  {stream.lastError && (
                    <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-[11px] text-red-300 flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="line-clamp-2">{stream.lastError}</span>
                    </div>
                  )}
                </div>

                {/* Primary Action Button Bar */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  {isLive || isStarting || isReconnecting ? (
                    <button
                      onClick={() => handleStopStream(stream)}
                      disabled={isActionBusy}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs border border-red-500/50 shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isActionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                      <span>STOP BROADCAST</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartStream(stream)}
                      disabled={isActionBusy}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs border border-red-400/50 shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isActionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      <span>START 24/7 STREAM</span>
                    </button>
                  )}

                  {isLive && (
                    <button
                      onClick={() => handleRestartStream(stream)}
                      disabled={isActionBusy}
                      className="p-3 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-white text-xs border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                      title="Restart Stream"
                    >
                      <RefreshCw className={`w-4 h-4 ${isActionBusy ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE / EDIT STREAM MODAL */}
      {/* ========================================================= */}
      {streamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0e0e12] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingStreamId ? 'Configure Live Stream' : 'Create New Live Stream'}
                  </h3>
                  <p className="text-xs text-slate-400">Independent 24/7 RTMP Broadcast Instance</p>
                </div>
              </div>
              <button
                onClick={() => setStreamModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStream} className="space-y-4 text-xs">
              {/* Stream Name */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Stream Name / Channel Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Main Channel 24/7 Lo-Fi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              {/* RTMP Server URL */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  RTMP Server Destination
                </label>
                <input
                  type="text"
                  required
                  placeholder="rtmps://a.rtmps.youtube.com/live2"
                  value={formRtmpUrl}
                  onChange={(e) => setFormRtmpUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  YouTube RTMPS on Port 443 SSL is recommended for rock-solid stability.
                </p>
              </div>

              {/* YouTube Stream Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">YouTube Stream Key</label>
                  <button
                    type="button"
                    onClick={() => setShowKeyInModal(!showKeyInModal)}
                    className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    {showKeyInModal ? 'Hide Key' : 'Reveal Key'}
                  </button>
                </div>
                <input
                  type={showKeyInModal ? 'text' : 'password'}
                  required
                  placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                  value={formStreamKey}
                  onChange={(e) => setFormStreamKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {/* Media Source Selector */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-3">
                <label className="block font-semibold text-slate-300">Media Broadcast Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSourceType('video')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formSourceType === 'video'
                        ? 'bg-red-600/20 border-red-500 text-white'
                        : 'bg-white/[0.04] border-white/10 text-slate-400'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    Single Video Loop
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSourceType('playlist')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formSourceType === 'playlist'
                        ? 'bg-red-600/20 border-red-500 text-white'
                        : 'bg-white/[0.04] border-white/10 text-slate-400'
                    }`}
                  >
                    <ListVideo className="w-3.5 h-3.5" />
                    Multi-Video Playlist
                  </button>
                </div>

                {formSourceType === 'video' ? (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Select Video from Library</label>
                    <select
                      value={formVideoId}
                      onChange={(e) => setFormVideoId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/80 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                    >
                      {videos.length === 0 ? (
                        <option value="">No videos available. Please upload one first.</option>
                      ) : (
                        videos.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.originalName} ({v.resolution || '1080p'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Select Playlist</label>
                    <select
                      value={formPlaylistId}
                      onChange={(e) => setFormPlaylistId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/80 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                    >
                      {playlists.length === 0 ? (
                        <option value="">No playlists created yet.</option>
                      ) : (
                        playlists.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.videoIds.length} videos - {p.totalDurationFormatted || '00:00'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Encoder Options */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Resolution</label>
                  <select
                    value={formQuality}
                    onChange={(e) => setFormQuality(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="1080p">1080p FHD</option>
                    <option value="720p">720p HD</option>
                    <option value="source">Source Match</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bitrate</label>
                  <select
                    value={formBitrate}
                    onChange={(e) => setFormBitrate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="6000k">6000 kbps (High)</option>
                    <option value="4500k">4500 kbps (Standard)</option>
                    <option value="3000k">3000 kbps (Balanced)</option>
                    <option value="2000k">2000 kbps (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">FPS</label>
                  <select
                    value={formFps}
                    onChange={(e) => setFormFps(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="60">60 FPS</option>
                    <option value="30">30 FPS</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoReconnect}
                    onChange={(e) => setFormAutoReconnect(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 bg-black border-slate-700"
                  />
                  <span>Auto-Reconnect if dropped</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAudio}
                    onChange={(e) => setFormAudio(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 bg-black border-slate-700"
                  />
                  <span>Enable AAC Audio</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setStreamModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-xs font-bold text-white shadow-md shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {modalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingStreamId ? 'Update Stream' : 'Create Stream'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIVE TERMINAL LOGS MODAL */}
      {/* ========================================================= */}
      {terminalStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#08080a] border border-red-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
            {/* Terminal Header */}
            <div className="p-4 bg-[#0d0d12] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{terminalStream.name}</span>
                    <span className="text-xs font-mono text-slate-400">— Live FFmpeg Output</span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500">
                    Destination: {terminalStream.rtmpUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoScrollLogs(!autoScrollLogs)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    autoScrollLogs ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Auto-Scroll: {autoScrollLogs ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={async () => {
                    await api.clearStreamInstanceLogs(terminalStream.id);
                    setTerminalLogs([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>

                <button
                  onClick={() => setTerminalStream(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-xs text-slate-400 hover:text-white ml-2 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Terminal Logs Content */}
            <div
              ref={logsEndRef}
              className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 bg-black/95 text-slate-300 selection:bg-red-500 selection:text-white"
            >
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 py-8 text-center">
                  Waiting for FFmpeg output stream...
                </div>
              ) : (
                terminalLogs.map((log) => {
                  let colorClass = 'text-slate-300';
                  if (log.level === 'error') colorClass = 'text-red-400 font-semibold';
                  else if (log.level === 'warn') colorClass = 'text-amber-400';
                  else if (log.level === 'stats') colorClass = 'text-emerald-400';

                  return (
                    <div key={log.id} className="flex items-start gap-2 hover:bg-white/[0.02] px-1 py-0.5 rounded">
                      <span className="text-slate-600 text-[10px] select-none shrink-0 font-mono">
                        [{log.timestamp.slice(11, 19)}]
                      </span>
                      <span className={`${colorClass} break-all leading-relaxed`}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE STREAM CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deleteStreamTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0e0e12] border border-red-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Stream Configuration</h3>
                <p className="text-xs text-slate-400">{deleteStreamTarget.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this stream configuration? This will remove the RTMP destination and settings. The underlying video files will not be deleted.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeletingStream}
                onClick={() => setDeleteStreamTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingStream}
                onClick={handleConfirmDeleteStream}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingStream ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Stream</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
