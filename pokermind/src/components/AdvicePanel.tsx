import type { AdviceResult } from '@/types/poker';

interface Props {
  advice: AdviceResult | null;
  isLoading: boolean;
  nullFields: string[];
}

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  fold:   { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  call:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  check:  { bg: 'bg-gray-500/10',   text: 'text-gray-300',   border: 'border-gray-500/30' },
  raise:  { bg: 'bg-[#00d4aa]/10',  text: 'text-[#00d4aa]',  border: 'border-[#00d4aa]/30' },
  bet:    { bg: 'bg-[#00d4aa]/10',  text: 'text-[#00d4aa]',  border: 'border-[#00d4aa]/30' },
  allin:  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
};

function getActionStyle(action: string) {
  const key = action.split(' ')[0].toLowerCase();
  return ACTION_STYLES[key] ?? ACTION_STYLES.call;
}

export default function AdvicePanel({ advice, isLoading, nullFields }: Props) {
  if (isLoading) {
    return (
      <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl p-5 flex items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#00d4aa] border-t-transparent animate-spin flex-shrink-0" />
        <div>
          <div className="text-white font-medium text-sm">Analyzing hand...</div>
          <div className="text-[#5a7a9a] text-xs mt-0.5">Sending to Claude AI</div>
        </div>
      </div>
    );
  }

  if (nullFields.length > 0 && !advice) {
    return (
      <div className="bg-[#0f1923] border border-yellow-500/30 rounded-xl p-5">
        <div className="text-yellow-400 font-semibold text-sm mb-2">⚠ Hand not readable</div>
        <div className="text-[#5a7a9a] text-xs">
          Could not read: {nullFields.join(', ')}
        </div>
        <div className="text-[#3a5a6a] text-xs mt-1">
          Try triggering analysis again when the table is fully settled
        </div>
      </div>
    );
  }

  if (!advice) {
    return (
      <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl p-5">
        <div className="text-[#3a5a6a] text-sm text-center py-4">
          Press <kbd className="bg-[#162030] border border-[#2a3a4a] rounded px-2 py-0.5 text-xs text-[#5a7a9a]">Space</kbd> when it's your turn
        </div>
      </div>
    );
  }

  const style = getActionStyle(advice.action);
  const confidenceColor = advice.confidence === 'high'
    ? 'text-[#00d4aa]' : advice.confidence === 'medium'
    ? 'text-yellow-400' : 'text-[#5a7a9a]';

  return (
    <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl overflow-hidden">
      {/* Action header */}
      <div className={`${style.bg} ${style.border} border-b px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-black uppercase tracking-wide ${style.text}`}>
            {advice.action}
          </span>
          {advice.sizing_bb && (
            <span className={`text-sm font-semibold ${style.text} opacity-70`}>
              {advice.sizing_bb} BB
            </span>
          )}
        </div>
        <span className={`text-xs font-medium uppercase tracking-widest ${confidenceColor}`}>
          {advice.confidence} confidence
        </span>
      </div>

      {/* Reasoning */}
      <div className="px-5 py-4">
        <p className="text-[#b0c8d8] text-sm leading-relaxed">{advice.reasoning}</p>

        {advice.exploit_note && (
          <div className="mt-3 bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-lg px-4 py-3">
            <div className="text-[#f5a623] text-xs font-semibold uppercase tracking-wider mb-1">
              ⚡ Exploitative Read
            </div>
            <p className="text-[#d4b070] text-xs leading-relaxed">{advice.exploit_note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
