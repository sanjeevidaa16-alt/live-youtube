import React from 'react';
import { Layers, Radio, Music, Gamepad2, Sparkles, Moon, Code, Film, Tv } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const categoryCards = [
    {
      id: 'lofi',
      name: 'Lo-Fi & Study Beats',
      count: '1,420 Streams',
      icon: Music,
      desc: 'Mellow instrumental beats, vinyl crackles, and cozy studying atmospheres 24/7.',
      color: 'from-purple-900/40 to-pink-900/20',
      border: 'border-purple-500/30',
      tag: 'HOT',
    },
    {
      id: 'gaming',
      name: 'Gaming & Speedruns',
      count: '980 Streams',
      icon: Gamepad2,
      desc: 'Non-stop playthroughs, esports marathons, pixel arcade gameplay, and walkthroughs.',
      color: 'from-red-900/40 to-orange-900/20',
      border: 'border-red-500/30',
      tag: 'TRENDING',
    },
    {
      id: 'synthwave',
      name: 'Synthwave & Retrowave',
      count: '640 Streams',
      icon: Sparkles,
      desc: '80s retro futuristic synth beats, neon highway visuals, and electronic chillout.',
      color: 'from-cyan-900/40 to-blue-900/20',
      border: 'border-cyan-500/30',
      tag: 'POPULAR',
    },
    {
      id: 'ambient',
      name: 'Relaxation & Nature',
      count: '820 Streams',
      icon: Moon,
      desc: 'Rain sounds, deep space interstellar visuals, gentle ocean waves, and sleep audio.',
      color: 'from-emerald-900/40 to-teal-900/20',
      border: 'border-emerald-500/30',
      tag: 'CALM',
    },
    {
      id: 'coding',
      name: 'Coding & Deep Focus',
      count: '430 Streams',
      icon: Code,
      desc: 'Cyber ambient loops, minimal tech rhythm, and concentration frequencies.',
      color: 'from-blue-900/40 to-indigo-900/20',
      border: 'border-blue-500/30',
      tag: 'PRODUCTIVE',
    },
    {
      id: 'cinema',
      name: 'Classic Cinema & Shows',
      count: '510 Streams',
      icon: Film,
      desc: 'Vintage public domain movies, classic television series, and retro cartoon loops.',
      color: 'from-amber-900/40 to-yellow-900/20',
      border: 'border-amber-500/30',
      tag: 'CLASSIC',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Layers className="w-3.5 h-3.5 text-red-500" />
          Categorized Broadcasting
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Browse by Categories
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Find endless 24/7 continuous streams tailored to your mood and activities.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`group p-6 rounded-3xl bg-gradient-to-br ${card.color} border ${card.border} hover:border-red-500/60 transition-all duration-300 shadow-lg hover:shadow-[0_10px_35px_rgba(255,20,20,0.2)] cursor-pointer flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-white shadow-inner">
                    <Icon className="w-6 h-6 text-red-400" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-wider">
                    {card.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                  {card.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">{card.count}</span>
                <span className="text-red-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
