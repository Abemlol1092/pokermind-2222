import { useState } from 'react';

interface Props {
  raw: any | null;
}

export default function RawJsonPanel({ raw }: Props) {
  const [open, setOpen] = useState(false);

  if (!raw) return null;

  return (
    <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#162030]/50 transition-colors"
      >
        <span className="text-[#3a5a6a] text-xs font-mono uppercase tracking-wider">
          Raw JSON Response
        </span>
        <span className="text-[#3a5a6a] text-xs">{open ? '▲ hide' : '▼ show'}</span>
      </button>
      {open && (
        <div className="border-t border-[#1a2a3a] px-5 py-4 overflow-x-auto">
          <pre className="text-[#5a9a7a] text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
