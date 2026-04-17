import type { HandRecord, GameState } from '@/types/poker';

const STORAGE_KEY = 'pokermind_hand_history';
const MAX_HANDS = 500;

function loadHands(): HandRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHands(hands: HandRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hands.slice(-MAX_HANDS)));
  } catch {}
}

export function saveHand(
  gameState: GameState,
  advice: string,
  reasoning: string
): HandRecord {
  const hands = loadHands();
  const record: HandRecord = {
    id: `hand_${Date.now()}`,
    timestamp: Date.now(),
    hero_cards: gameState.hero_cards || [],
    hero_position: gameState.hero_position,
    street: gameState.street,
    action_facing: gameState.action_facing,
    pot_type: gameState.pot_type,
    effective_stack_bb: gameState.effective_stack_bb,
    advice_given: advice,
    reasoning,
    players_seen: [
      ...gameState.players_in_hand.map(p => p.name),
      ...gameState.players_folded,
    ],
    raw_state: gameState,
  };
  hands.push(record);
  saveHands(hands);
  return record;
}

export function getRecentHands(limit = 20): HandRecord[] {
  return loadHands().slice(-limit).reverse();
}

export function findSimilarHands(gameState: GameState, limit = 3): HandRecord[] {
  const hands = loadHands();
  if (hands.length === 0) return [];

  const scored = hands
    .filter(h => h.id !== undefined)
    .map(h => {
      let score = 0;
      // Stack depth within 10BB
      if (
        gameState.effective_stack_bb != null &&
        h.effective_stack_bb != null &&
        Math.abs(gameState.effective_stack_bb - h.effective_stack_bb) <= 10
      ) score += 3;
      // Same position
      if (gameState.hero_position && h.hero_position === gameState.hero_position) score += 3;
      // Same action facing
      if (gameState.action_facing && h.action_facing === gameState.action_facing) score += 3;
      // Same street
      if (gameState.street && h.street === gameState.street) score += 2;
      // Same pot type
      if (gameState.pot_type && h.pot_type === gameState.pot_type) score += 2;
      return { hand: h, score };
    })
    .filter(x => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.hand);

  return scored;
}

export function clearHandHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
