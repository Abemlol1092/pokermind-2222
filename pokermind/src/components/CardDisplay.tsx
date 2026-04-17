interface CardProps {
  card: string; // e.g. "Ah", "Kd", "10c"
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
}

const SUIT_COLORS: Record<string, string> = {
  h: '#ef4444', // hearts = red
  d: '#3b82f6', // diamonds = blue (works for both 2-color and 4-color since we show symbol)
  c: '#22c55e', // clubs = green
  s: '#e2e8f0', // spades = white/light
};

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

function parseCard(card: string): { rank: string; suit: string } | null {
  if (!card || card.length < 2) return null;
  const suit = card.slice(-1).toLowerCase();
  const rank = card.slice(0, -1).toUpperCase();
  return { rank, suit };
}

export function PlayingCard({ card, size = 'md', faceDown = false }: CardProps) {
  const parsed = parseCard(card);

  const sizeClasses = {
    sm: 'w-8 h-11 text-xs',
    md: 'w-11 h-15 text-sm',
    lg: 'w-14 h-20 text-base',
  };

  const baseCls = `${sizeClasses[size]} rounded-md flex items-center justify-center font-bold select-none`;

  if (faceDown || !parsed) {
    return (
      <div className={`${baseCls} bg-[#1e3a5a] border border-[#2a4a6a]`}>
        <span className="text-[#2a4a6a] text-lg">?</span>
      </div>
    );
  }

  const { rank, suit } = parsed;
  const color = SUIT_COLORS[suit] ?? '#ffffff';
  const symbol = SUIT_SYMBOLS[suit] ?? suit;

  return (
    <div
      className={`${baseCls} bg-[#f8f8f2] border border-[#00000020] flex-col gap-0`}
      style={{ minWidth: size === 'sm' ? 32 : size === 'lg' ? 56 : 44 }}
    >
      <span className="leading-none" style={{ color, fontSize: size === 'lg' ? 18 : size === 'sm' ? 12 : 15 }}>
        {rank}
      </span>
      <span className="leading-none" style={{ color, fontSize: size === 'lg' ? 14 : size === 'sm' ? 10 : 12 }}>
        {symbol}
      </span>
    </div>
  );
}

interface HandProps {
  cards: string[] | null;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function CardHand({ cards, size = 'md', label }: HandProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[#5a7a9a] text-xs uppercase tracking-wider">{label}</span>}
      <div className="flex gap-1.5">
        {cards && cards.length > 0
          ? cards.map((c, i) => <PlayingCard key={i} card={c} size={size} />)
          : [0, 1].map(i => <PlayingCard key={i} card="" size={size} faceDown />)}
      </div>
    </div>
  );
}
