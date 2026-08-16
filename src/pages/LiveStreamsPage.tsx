import React, { useState } from 'react';
import { Radio, Search, Filter, Play, Clock, Users, Flame, Tag, CheckCircle } from 'lucide-react';

export const LiveStreamsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeVideoModal, setActiveVideoModal] = useState<any | null>(null);

  const categories = [
    { id: 'all', name: 'All Streams' },
    { id: 'lofi', name: 'Lo-Fi Beats' },
    { id: 'gaming', name: 'Gaming 24/7' },
    { id: 'synthwave', name: 'Synthwave & Retro' },
    { id: 'ambient', name: 'Nature & Relax' },
    { id: 'anime', name: 'Anime Radio' },
    { id: 'coding', name: 'Coding & Focus' },
  ];

  const streams = [
    {
      id: 'ls1',
      title: '24/7 Chillhop Radio — Jasmine Beats & Smooth Lo-Fi Melodies',
      category: 'lofi',
      channel: 'Chill Beats 24/7',
      viewers: 18450,
      uptime: '620h 14m',
      fps: 60,
      res: '1080p',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
      description: 'Continuous smooth lo-fi beats designed for focus, coding, studying, and deep relaxation.',
    },
    {
      id: 'ls2',
      title: 'Neon Cyberpunk 2077 Night Drive — Dark Synthwave / Electro 24/7',
      category: 'synthwave',
      channel: 'Retro Wave Hub',
      viewers: 9320,
      uptime: '194h 05m',
      fps: 60,
      res: '1080p',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      description: 'Night cruising through neon dystopian horizons accompanied by heavy synth baselines.',
    },
    {
      id: 'ls3',
      title: 'Deep Space Galaxy 4K — Relaxing Ambient Music for Sleep & Meditation',
      category: 'ambient',
      channel: 'Cosmic Horizons',
      viewers: 7210,
      uptime: '480h 30m',
      fps: 30,
      res: '1080p',
      thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
      description: 'Stunning 4K Hubble telescope footage and soothing interstellar pads.',
    },
    {
      id: 'ls4',
      title: 'Retro Pixel Arcade & NES Speedruns Marathon 24/7',
      category: 'gaming',
      channel: '8-Bit Legends',
      viewers: 14200,
      uptime: '310h 45m',
      fps: 60,
      res: '1080p',
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      description: 'Classic gaming walkthroughs, world record speedruns, and nostalgic pixel animations.',
    },
    {
      id: 'ls5',
      title: 'Deep Focus Coding Music — Tech Minimal & Cyber Glitch 24/7 Loop',
      category: 'coding',
      channel: 'DevFlow Radio',
      viewers: 5890,
      uptime: '150h 10m',
      fps: 60,
      res: '1080p',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      description: 'High-focus audio for programming sessions, hackathons, and problem solving.',
    },
    {
      id: 'ls6',
      title: 'Tokyo Night Rain & Anime Lo-Fi Cafe Ambience 24/7',
      category: 'anime',
      channel: 'Shibuya Beats',
      viewers: 11400,
      uptime: '275h 30m',
      fps: 30,
      res: '1080p',
      thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
      description: 'Gentle raindrops on Tokyo window glass with heartwarming anime acoustic lo-fi.',
    },
  ];

  const filteredStreams = streams.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            24/7 Continuous Broadcasts
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore Live Streams
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse non-stop live streams broadcasting 24 hours a day on YouTube RTMP.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search live streams, channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/[0.08] focus:border-red-500 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none backdrop-blur-md"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(255,26,26,0.5)] border border-red-400/40'
                : 'bg-[#111116] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Streams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStreams.map((stream) => (
          <div
            key={stream.id}
            onClick={() => setActiveVideoModal(stream)}
            className="group bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-[0_10px_35px_rgba(255,20,20,0.2)] transition-all duration-300 cursor-pointer flex flex-col"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
              <img
                src={stream.thumbnail}
                alt={stream.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                LIVE NOW
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-white/90 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl">
                <span className="flex items-center gap-1 text-red-400">
                  <Users className="w-3.5 h-3.5" />
                  {stream.viewers.toLocaleString()} watching
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {stream.uptime}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
              <h3 className="text-sm font-bold text-white line-clamp-2 mb-2 group-hover:text-red-300 transition-colors">
                {stream.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                {stream.description}
              </p>
              <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 truncate">{stream.channel}</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-400">
                  {stream.res} {stream.fps}fps
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#0e0e12] border border-red-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,20,20,0.3)]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-bold text-sm text-white truncate max-w-md">
                  {activeVideoModal.title}
                </span>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-slate-400 hover:text-white px-3 py-1 rounded-xl text-xs hover:bg-white/10"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <img
                src={activeVideoModal.thumbnail}
                alt="Stream View"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-center p-6 bg-black/70 backdrop-blur-md rounded-2xl border border-red-500/30">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                  <div className="font-bold text-white text-base">Connected to 24/7 RTMP Stream</div>
                  <div className="text-xs text-slate-300 mt-1">Live from Cloud VPS Broadcaster</div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#0a0a0d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-white text-sm">{activeVideoModal.channel}</div>
                <div className="text-xs text-slate-400 mt-0.5">{activeVideoModal.description}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs">
                  <span className="text-slate-400">Viewers: </span>
                  <strong className="text-red-400">{activeVideoModal.viewers.toLocaleString()}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs">
                  <span className="text-slate-400">Uptime: </span>
                  <strong className="text-white">{activeVideoModal.uptime}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
