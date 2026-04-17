import { useState } from 'react';
import type { SessionConfig, TableSize, CardTheme } from '@/types/poker';

interface Props {
  isOpen: boolean;
  initial?: SessionConfig;
  onConfirm: (config: SessionConfig) => void;
  onClose: () => void;
}

const TABLE_SIZES: { value: TableSize; label: string }[] = [
  { value: 2, label: 'Heads Up (2-max)' },
  { value: 3, label: '3-Handed' },
  { value: 6, label: '6-Max' },
  { value: 9, label: 'Full Ring (9-max)' },
];

const BLIND_PRESETS = [
  { label: '$0.01/$0.02', bb: 0.02 },
  { label: '$0.02/$0.05', bb: 0.05 },
  { label: '$0.05/$0.10', bb: 0.10 },
  { label: '$0.10/$0.25', bb: 0.25 },
  { label: '$0.25/$0.50', bb: 0.50 },
  { label: '$0.50/$1.00', bb: 1.00 },
  { label: '$1/$2', bb: 2.00 },
  { label: 'Custom', bb: -1 },
];

export default function SessionModal({ isOpen, initial, onConfirm, onClose }: Props) {
  const [tableSize, setTableSize] = useState<TableSize>(initial?.tableSize ?? 6);
  const [cardTheme, setCardTheme] = useState<CardTheme>(initial?.cardTheme ?? '2color');
  const [bbPreset, setBbPreset] = useState(0.05);
  const [customBb, setCustomBb] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [adviceMode, setAdviceMode] = useState<SessionConfig['adviceMode']>(
    initial?.adviceMode ?? 'balanced'
  );

  if (!isOpen) return null;

  const effectiveBb = isCustom ? parseFloat(customBb) || 0.05 : bbPreset;

  const handleConfirm = () => {
    onConfirm({
      tableSize,
      cardTheme,
      bigBlindDollar: effectiveBb,
      adviceMode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-2xl p-8 w-[480px] shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">New Session</h2>
        <p className="text-[#5a7a9a] text-sm mb-6">Configure your cash game settings</p>

        {/* Table size */}
        <div className="mb-5">
          <label className="text-[#8aaabb] text-xs font-semibold uppercase tracking-widest mb-2 block">
            Table Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TABLE_SIZES.map(ts => (
              <button
                key={ts.value}
                onClick={() => setTableSize(ts.value)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                  tableSize === ts.value
                    ? 'bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa]'
                    : 'bg-[#162030] border-[#2a3a4a] text-[#5a7a9a] hover:border-[#3a5a6a]'
                }`}
              >
                {ts.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blind level */}
        <div className="mb-5">
          <label className="text-[#8aaabb] text-xs font-semibold uppercase tracking-widest mb-2 block">
            Blind Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {BLIND_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  if (p.bb === -1) {
                    setIsCustom(true);
                  } else {
                    setIsCustom(false);
                    setBbPreset(p.bb);
                  }
                }}
                className={`py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                  (p.bb !== -1 && bbPreset === p.bb && !isCustom) || (p.bb === -1 && isCustom)
                    ? 'bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa]'
                    : 'bg-[#162030] border-[#2a3a4a] text-[#5a7a9a] hover:border-[#3a5a6a]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {isCustom && (
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Big blind in $ (e.g. 0.05)"
              value={customBb}
              onChange={e => setCustomBb(e.target.value)}
              className="mt-2 w-full bg-[#162030] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#3a5a6a] focus:outline-none focus:border-[#00d4aa]"
            />
          )}
        </div>

        {/* Card theme */}
        <div className="mb-5">
          <label className="text-[#8aaabb] text-xs font-semibold uppercase tracking-widest mb-2 block">
            Card Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: '2color', label: '2-Color (Standard)', sub: 'Red & Black' },
              { value: '4color', label: '4-Color', sub: 'Red/Blue/Green/Black' },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setCardTheme(t.value as CardTheme)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border text-left ${
                  cardTheme === t.value
                    ? 'bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa]'
                    : 'bg-[#162030] border-[#2a3a4a] text-[#5a7a9a] hover:border-[#3a5a6a]'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-xs opacity-60 mt-0.5">{t.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advice mode */}
        <div className="mb-7">
          <label className="text-[#8aaabb] text-xs font-semibold uppercase tracking-widest mb-2 block">
            Advice Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'gto', label: 'GTO', sub: 'Solver-based' },
              { value: 'balanced', label: 'Balanced', sub: 'GTO + exploits' },
              { value: 'exploitative', label: 'Exploitative', sub: 'Max exploits' },
            ].map(m => (
              <button
                key={m.value}
                onClick={() => setAdviceMode(m.value as SessionConfig['adviceMode'])}
                className={`py-2.5 px-2 rounded-lg text-xs font-medium transition-all border text-center ${
                  adviceMode === m.value
                    ? 'bg-[#f5a623]/20 border-[#f5a623] text-[#f5a623]'
                    : 'bg-[#162030] border-[#2a3a4a] text-[#5a7a9a] hover:border-[#3a5a6a]'
                }`}
              >
                <div className="font-semibold">{m.label}</div>
                <div className="opacity-60 mt-0.5">{m.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#162030] rounded-lg px-4 py-3 mb-6 text-xs text-[#5a7a9a]">
          <span className="text-[#8aaabb]">Session: </span>
          {tableSize}-max Cash · ${(effectiveBb / 2).toFixed(2)}/${effectiveBb.toFixed(2)} ·{' '}
          {cardTheme === '4color' ? '4-Color deck' : '2-Color deck'} · {adviceMode} mode
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#2a3a4a] text-[#5a7a9a] text-sm font-medium hover:border-[#3a5a6a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-[#00d4aa] text-black text-sm font-bold hover:bg-[#00bfa0] transition-colors"
          >
            Start Session →
          </button>
        </div>
      </div>
    </div>
  );
}
