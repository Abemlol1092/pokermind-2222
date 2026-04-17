import type { HandRecord } from '@/types/poker';

interface Props {
  hands: HandRecord[];
}

const ACTION_COLORS: Record<string, string> = {
  fold: 'text-red-400',
  call: 'text-blue-400',
  check: 'text-gray-400',
  raise: 'text-[#00d4aa]',
  bet: 'text-[#00d4aa]',
  allin: 'text-orange-400',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function HandHistoryLog({ hands }: Props) {
  return (
    <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b border-[#1a2a3a] flex-shrink-0">
        <span className="text-[#5a7a9a] text-xs font-semibold uppercase tracking-widest">
          Hand History
        </span>
        {hands.length > 0 && (
          <span className="ml-2 text-[#3a5a6a] text-xs">{hands.length} hands</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {hands.length === 0 ? (
          <div className="px-5 py-4 text-[#3a5a6a] text-xs text-center">
            No hands analyzed yet this session
          </div>
        ) : (
          <div className="divide-y divide-[#1a2a3a]">
            {hands.map(h => {
              const actionWord = h.advice_given.split(' ')[0].toLowerCase();
              const actionColor = ACTION_COLORS[actionWord] ?? 'text-white';
              return (
                <div key={h.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-[#162030]/50 transition-colors">
                  {/* Cards */}
                  <div className="flex gap-1 flex-shrink-0">
                    {(h.hero_cards || []).map((c, i) => (
                      <span key={i} className="text-white text-xs font-mono bg-[#162030] border border-[#2a3a4a] rounded px-1 py-0.5">
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Position & street */}
                  <div className="flex items-center gap-1.5 text-xs text-[#5a7a9a] flex-shrink-0">
                    <span>{h.hero_position ?? '?'}</span>
                    <span className="text-[#2a3a4a]">·</span>
                    <span className="capitalize">{h.street ?? '?'}</span>
                  </div>

                  {/* Advice */}
                  <div className={`text-xs font-bold uppercase flex-1 ${actionColor}`}>
                    {h.advice_given}
                  </div>

                  {/* Time */}
                  <div className="text-[#3a5a6a] text-xs flex-shrink-0">
                    {timeAgo(h.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
