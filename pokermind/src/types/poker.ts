export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionFacing = 'none' | 'limp' | 'raise' | '3bet' | '4bet' | 'allin';
export type PotType = 'heads_up' | 'three_way' | 'multiway';
export type PlayerClass = 'unknown' | 'fish' | 'reg' | 'aggro' | 'nit';
export type Confidence = 'high' | 'medium' | 'low';
export type TableSize = 2 | 3 | 4 | 6 | 9;
export type CardTheme = '2color' | '4color';

export interface Card {
  rank: string;
  suit: string;
  display: string; // e.g. "Ah", "Kd"
}

export interface PlayerAction {
  player: string;
  position: string;
  action: string;
  amount_bb: number | null;
}

export interface PlayerInHand {
  name: string;
  position: string | null;
  stack_bb: number | null;
  last_action: string | null;
}

export interface AdviceResult {
  action: string;
  sizing_bb: number | null;
  reasoning: string;
  exploit_note: string | null;
  confidence: Confidence;
}

export interface GameState {
  hero_cards: string[] | null;
  hero_position: string | null;
  board_cards: string[];
  street: Street | null;
  pot_size_bb: number | null;
  pot_type: PotType | null;
  players_remaining_in_hand: number | null;
  action_facing: ActionFacing | null;
  amount_to_call_bb: number | null;
  action_history: PlayerAction[];
  players_in_hand: PlayerInHand[];
  players_folded: string[];
  aggressor_name: string | null;
  aggressor_amount_bb: number | null;
  effective_stack_bb: number | null;
  blinds: string | null;
  big_blind_dollar: number | null;
}

export interface PlayerProfile {
  name: string;
  hands_observed: number;
  classification: PlayerClass;
  confidence: Confidence;
  tendencies: string[];
  last_seen: number;
  vpip_estimate: number | null; // voluntarily put $ in pot %
  aggression_estimate: number | null;
}

export interface HandRecord {
  id: string;
  timestamp: number;
  hero_cards: string[];
  hero_position: string | null;
  street: string | null;
  action_facing: string | null;
  pot_type: string | null;
  effective_stack_bb: number | null;
  advice_given: string;
  reasoning: string;
  players_seen: string[];
  raw_state: GameState;
}

export interface SessionConfig {
  tableSize: TableSize;
  cardTheme: CardTheme;
  bigBlindDollar: number; // e.g. 0.05 for $0.02/$0.05
  adviceMode: 'gto' | 'balanced' | 'exploitative';
}

export interface SessionStats {
  handsAnalyzed: number;
  apiCalls: number;
  totalTokens: number;
  estimatedCost: number;
}

export type AppPhase =
  | 'idle'
  | 'running'
  | 'capturing'
  | 'analyzing'
  | 'advice_ready'
  | 'cooldown';
