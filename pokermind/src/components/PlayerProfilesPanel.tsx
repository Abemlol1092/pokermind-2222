import type { PlayerProfile } from '@/types/poker';

interface Props {
  profiles: PlayerProfile[];
}

const CLASS_CONFIG = {
  fish:    { emoji: '🐟', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  reg:     { emoji: '🎯', color: 'text-gray-300',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
  aggro:   { emoji: '💢', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  nit:     { emoji: '🧊', color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
  unknown: { emoji: '❓', color: 'text-[#5a7a9a]',  bg: 'bg-[#162030]',     border: 'border-[#2a3a4a]' },
};

export default function PlayerProfilesPanel({ profiles }: Props) {
  const active = profiles.filter(p => p.hands_observed > 0).slice(0, 8);

  return (
    <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1a2a3a]">
        <span className="text-[#5a7a9a] text-xs font-semibold uppercase tracking-widest">
          Player Profiles
        </span>
        {active.length > 0 && (
          <span className="ml-2 text-[#3a5a6a] text-xs">{active.length} tracked</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="px-5 py-4 text-[#3a5a6a] text-xs text-center">
          Profiles build automatically as hands are played
        </div>
      ) : (
        <div className="divide-y divide-[#1a2a3a]">
          {active.map(p => {
            const cfg = CLASS_CONFIG[p.classification] ?? CLASS_CONFIG.unknown;
            return (
              <div key={p.name} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{p.name}</span>
                    <span className={`text-xs font-semibold uppercase ${cfg.color}`}>
                      {p.classification}
                    </span>
                    <span className="text-[#3a5a6a] text-xs">{p.hands_observed}h</span>
                  </div>
                  {p.tendencies.length > 0 && (
                    <div className="text-[#4a6a7a] text-xs mt-0.5 truncate">
                      {p.tendencies.slice(-3).join(' · ')}
                    </div>
                  )}
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${
                  p.confidence === 'high' ? 'text-[#00d4aa] bg-[#00d4aa]/10' :
                  p.confidence === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                  'text-[#3a5a6a] bg-[#162030]'
                }`}>
                  {p.confidence}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
