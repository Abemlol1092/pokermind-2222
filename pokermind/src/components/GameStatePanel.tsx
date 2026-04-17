import type { GameState } from '@/types/poker';
import { CardHand } from './CardDisplay';

interface Props {
  gameState: GameState | null;
}

export default function GameStatePanel({ gameState }: Props) {
  if (!gameState) {
    return (
      <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl p-5">
        <div className="text-[#3a5a6a] text-sm text-center py-2">No hand data yet</div>
      </div>
    );
  }

  const gs = gameState;

  const potTypeLabel: Record<string, string> = {
    heads_up: 'Heads Up',
    three_way: '3-Way',
    multiway: 'Multiway',
  };

  const actionLabel: Record<string, string> = {
    none: 'First to Act',
    limp: 'Facing Limp',
    raise: 'Facing Raise',
    '3bet': 'Facing 3-Bet',
    '4bet': 'Facing 4-Bet',
    allin: 'Facing All-In',
  };

  return (
    <div className="bg-[#0f1923] border border-[#2a3a4a] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-3 border-b border-[#1a2a3a] flex items-center justify-between">
        <span className="text-[#5a7a9a] text-xs font-semibold uppercase tracking-widest">Game State</span>
        <div className="flex items-center gap-3">
          {gs.street && (
            <span className="text-xs font-bold uppercase text-[#00d4aa] tracking-wider">
              {gs.street}
            </span>
          )}
          {gs.pot_type && (
            <span className="text-xs text-[#5a7a9a]">
              {potTypeLabel[gs.pot_type] ?? gs.pot_type}
            </span>
          )}
          {gs.blinds && (
            <span className="text-xs text-[#3a5a6a]">{gs.blinds}</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Cards row */}
        <div className="flex items-start gap-6">
          <CardHand cards={gs.hero_cards} size="lg" label="Hero" />
          {gs.board_cards.length > 0 && (
            <CardHand cards={gs.board_cards} size="lg" label="Board" />
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Pot" value={gs.pot_size_bb != null ? `${gs.pot_size_bb} BB` : '—'} />
          <StatBox label="To Call" value={gs.amount_to_call_bb != null ? `${gs.amount_to_call_bb} BB` : '—'} />
          <StatBox label="Eff. Stack" value={gs.effective_stack_bb != null ? `${gs.effective_stack_bb} BB` : '—'} />
        </div>

        {/* Position & action */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Position"
            value={gs.hero_position ?? '—'}
            highlight={!!gs.hero_position}
          />
          <StatBox
            label="Situation"
            value={gs.action_facing ? actionLabel[gs.action_facing] ?? gs.action_facing : '—'}
          />
        </div>

        {/* Action history */}
        {gs.action_history.length > 0 && (
          <div>
            <div className="text-[#3a5a6a] text-xs uppercase tracking-wider mb-2">Action</div>
            <div className="space-y-1">
              {gs.action_history.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-[#5a7a9a] w-12 flex-shrink-0">{a.position ?? '?'}</span>
                  <span className="text-[#8aaabb] font-medium w-20 flex-shrink-0">{a.player}</span>
                  <span className={`font-semibold ${
                    a.action === 'fold' ? 'text-red-400' :
                    a.action === 'raise' || a.action === 'bet' || a.action === '3bet' ? 'text-[#00d4aa]' :
                    'text-[#b0c8d8]'
                  }`}>{a.action}</span>
                  {a.amount_bb != null && (
                    <span className="text-[#5a7a9a]">{a.amount_bb} BB</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Players in hand */}
        {gs.players_in_hand.length > 0 && (
          <div>
            <div className="text-[#3a5a6a] text-xs uppercase tracking-wider mb-2">Players</div>
            <div className="space-y-1">
              {gs.players_in_hand.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-[#5a7a9a] w-12 flex-shrink-0">{p.position ?? '?'}</span>
                  <span className="text-[#8aaabb] flex-1">{p.name}</span>
                  <span className="text-[#5a7a9a]">{p.stack_bb != null ? `${p.stack_bb} BB` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight = false }: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="bg-[#162030] rounded-lg px-3 py-2.5">
      <div className="text-[#3a5a6a] text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-bold text-sm ${highlight ? 'text-[#00d4aa]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
