import React from 'react';
import { Flame, Radio, Clock, Users, Play, Trophy, Sparkles } from 'lucide-react';

export const PopularPage: React.FC = () => {
  const topStreams = [
    {
      rank: 1,
      id: 'pop1',
      title: 'Lofi Girl — Beats to Relax/Study to 24/7 Infinite Stream',
      viewers: '48.9K',
      uptime: '1,420h 30m',
      likes: '2.1M',
      channel: 'Lofi Radio 24/7',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
      category: 'Music & Beats',
    },
    {
      rank: 2,
      id: 'pop2',
      title: 'Grand Theft Auto V & Roleplay Non-Stop Best Moments 24/7',
      viewers: '31.2K',
      uptime: '890h 15m',
      likes: '940K',
      channel: 'GTA Highlights Live',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      category: 'Gaming',
    },
    {
      rank: 3,
      id: 'pop3',
      title: 'Synthwave Night Drive — Cyberpunk Chillwave & Retrowave 24/7',
      viewers: '24.5K',
      uptime: '512h 40m',
      likes: '680K',
      channel: 'RetroSynth Station',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      category: 'Music & Synth',
    },
    {
      rank: 4,
      id: 'pop4',
      title: 'Nature Relaxation 4K — Tropical Rainforest Rain & Thunderstorm 24/7',
      viewers: '19.8K',
      uptime: '1,100h 00m',
      likes: '450K',
      channel: 'Nature Calms 24/7',
      thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
      category: 'Nature & Sleep',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Flame className="w-3.5 h-3.5 text-red-500" />
          Top 24/7 Trending
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Most Popular 24/7 Streams
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Top-rated continuous livestreams ranked by active viewers and total broadcast uptime.
        </p>
      </div>

      {/* Top Ranked List */}
      <div className="space-y-4">
        {topStreams.map((stream) => (
          <div
            key={stream.id}
            className="group p-4 sm:p-6 bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/50 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 shadow-lg hover:shadow-[0_10px_35px_rgba(255,20,20,0.15)]"
          >
            {/* Rank Badge & Thumbnail */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
                stream.rank === 1
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30'
                  : stream.rank === 2
                  ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black'
                  : stream.rank === 3
                  ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white'
                  : 'bg-white/10 text-slate-400'
              }`}>
                #{stream.rank}
              </div>

              <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                <img
                  src={stream.thumbnail}
                  alt={stream.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                  LIVE
                </div>
              </div>

              <div className="min-w-0 flex-1 md:hidden">
                <h3 className="text-sm font-bold text-white line-clamp-1">{stream.title}</h3>
                <div className="text-xs text-red-400 font-semibold mt-1">{stream.viewers} watching</div>
              </div>
            </div>

            {/* Title & Info */}
            <div className="hidden md:block flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">
                {stream.category} • {stream.channel}
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors line-clamp-1">
                {stream.title}
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  {stream.viewers} watching
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Uptime: <strong className="text-slate-300 ml-1">{stream.uptime}</strong>
                </span>
                <span>Likes: <strong className="text-slate-300">{stream.likes}</strong></span>
              </div>
            </div>

            {/* Action */}
            <div className="w-full md:w-auto flex items-center justify-end">
              <button className="w-full md:w-auto px-6 py-2.5 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch Stream</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
