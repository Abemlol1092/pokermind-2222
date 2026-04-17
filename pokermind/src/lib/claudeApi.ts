import type {
  GameState,
  AdviceResult,
  PlayerProfile,
  HandRecord,
  SessionConfig,
} from '@/types/poker';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1500;

// ─── Raw API call ────────────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userContent: any[]
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    text: data.content[0]?.text ?? '',
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(config: SessionConfig): string {
  const { tableSize, cardTheme, bigBlindDollar, adviceMode } = config;

  const positionMap: Record<number, string> = {
    2: 'BTN/SB and BB only',
    3: 'BTN, SB, BB',
    4: 'BTN, SB, BB, UTG',
    6: 'UTG, HJ, CO, BTN, SB, BB (clockwise from BTN)',
    9: 'UTG, UTG+1, UTG+2, MP, MP+1, HJ, CO, BTN, SB, BB',
  };

  const cardThemeBlock =
    cardTheme === '4color'
      ? `CARD THEME — 4-COLOR DECK:
  Hearts   ♥ = RED
  Diamonds ♦ = BLUE   ← BLUE suit symbol = Diamond, NEVER Spade
  Clubs    ♣ = GREEN  ← GREEN suit symbol = Club, NEVER Heart  
  Spades   ♠ = BLACK or WHITE
  Never assume 2-color defaults.`
      : `CARD THEME — STANDARD 2-COLOR DECK:
  Hearts ♥ = RED | Diamonds ♦ = RED
  Clubs ♣ = BLACK | Spades ♠ = BLACK`;

  const adviceBlock =
    adviceMode === 'gto'
      ? 'Favor GTO-balanced play. Only exploit when tendencies are extremely clear.'
      : adviceMode === 'exploitative'
      ? 'Aggressively exploit opponent tendencies. Deviate from GTO when profitable.'
      : 'Balance GTO fundamentals with exploitative adjustments based on visible reads.';

  return `You are PokerMind AI — an elite poker coach analyzing GGPoker cash game screenshots.

══ SESSION CONTEXT ══
Game: No-Limit Hold'em Cash Game
Table size: ${tableSize}-max
Big blind: $${bigBlindDollar.toFixed(2)}
Positions at this table: ${positionMap[tableSize] ?? positionMap[6]}

══ ${cardThemeBlock}

══ READING THE SCREENSHOT ══

HERO CARDS:
The two large face-up playing cards at the very bottom-center of the green 
felt table. They are significantly larger than community cards. Do NOT 
confuse with the hero's circular avatar/profile photo directly below them.

DEALER BUTTON:
Find the small circular chip marked "D" on the table felt first.
That player is BTN. All positions derive clockwise from BTN.
NEVER assign positions without first locating the D button.

STACK SIZES — CRITICAL:
GGPoker cash games display stacks in DOLLARS, not big blinds.
YOU MUST convert every dollar amount to BB by dividing by $${bigBlindDollar.toFixed(2)}.
Examples at this blind level:
  $${(bigBlindDollar * 100).toFixed(2)} displayed → ${(bigBlindDollar * 100 / bigBlindDollar).toFixed(0)} BB
  $${(bigBlindDollar * 50).toFixed(2)} displayed → ${(bigBlindDollar * 50 / bigBlindDollar).toFixed(0)} BB
  $${(bigBlindDollar * 20).toFixed(2)} displayed → ${(bigBlindDollar * 20 / bigBlindDollar).toFixed(0)} BB
Apply this conversion to ALL stack sizes, bet amounts, pot size, and call amounts.

POT SIZE: Gold "Total Pot:" text in the center of the table felt.
BETS: Chip stacks on the felt in front of each player with dollar amount below.
ACTIONS: Colored badge overlays on player avatars (Raise/Call/Fold/Check/Bet/Allin).
HERO BUTTONS: Fold/Call/Raise buttons at bottom-right of screen confirm it's hero's turn.

ACTIVE PLAYERS: Count players who have NOT folded.
  pot_type = "heads_up" (2 active) | "three_way" (3) | "multiway" (4+)

IGNORE COMPLETELY: Bad beat jackpot banners, leaderboard overlays, chat buttons,
lobby elements, sit-out dialogs, and anything outside the oval table felt.

══ ADVICE STRATEGY ══
${adviceBlock}

SANITY CHECKS (apply before finalizing advice):
- Heads-up + made hand (pair or better) on any street → default to betting/raising for value
- Never recommend folding when facing a check
- Verify pot_type before mentioning "multiple opponents"  
- If pot odds clearly justify a call (>33% equity needed and you likely have it) → call or raise
- Short effective stack (<20BB) + strong hand → consider shove
- Always state the action_facing clearly in your reasoning

══ OUTPUT FORMAT ══
Return ONLY a valid JSON object. No markdown fences, no explanation, no extra text.
Return null for any field you genuinely cannot read — never guess numeric values.
If hero_cards is null, set advice to null (cannot advise without knowing hero's hand).`;
}

// ─── User message ────────────────────────────────────────────────────────────

function buildUserMessage(
  imageBase64: string,
  playerProfiles: PlayerProfile[],
  similarHands: HandRecord[]
): any[] {
  let contextBlock = '';

  if (playerProfiles.length > 0) {
    contextBlock += '\nKNOWN OPPONENT PROFILES (adjust advice accordingly):\n';
    for (const p of playerProfiles) {
      const conf = p.confidence === 'high' ? '✓' : p.confidence === 'medium' ? '~' : '?';
      contextBlock += `• ${p.name} [${p.classification.toUpperCase()}${conf}] `
        + `${p.hands_observed}h observed — ${p.tendencies.slice(-3).join(', ') || 'no data yet'}\n`;
    }
  }

  if (similarHands.length > 0) {
    contextBlock += '\nSIMILAR PAST SPOTS FROM YOUR HISTORY:\n';
    for (const h of similarHands) {
      contextBlock += `• ${h.street} | facing ${h.action_facing} | ${h.hero_position} | `
        + `advice was: ${h.advice_given}\n`;
    }
  }

  const userText = `Analyze this GGPoker cash game screenshot. Hero's action buttons confirm it is hero's turn.
${contextBlock}
Extract the complete game state and provide advice. Return this exact JSON:

{
  "hero_cards": ["Ah","Kd"] or null,
  "hero_position": "BTN" or null,
  "board_cards": ["6c","3h","9s"] or [],
  "street": "preflop" | "flop" | "turn" | "river",
  "pot_size_bb": 6.5 or null,
  "pot_type": "heads_up" | "three_way" | "multiway",
  "players_remaining_in_hand": 2,
  "action_facing": "none" | "limp" | "raise" | "3bet" | "4bet" | "allin",
  "amount_to_call_bb": 3.0 or null,
  "action_history": [
    { "player": "Name", "position": "UTG", "action": "raise", "amount_bb": 2.5 }
  ],
  "players_in_hand": [
    { "name": "Name", "position": "BTN", "stack_bb": 97.4, "last_action": "raise" }
  ],
  "players_folded": ["Name1", "Name2"],
  "aggressor_name": "Name" or null,
  "aggressor_amount_bb": 5.5 or null,
  "effective_stack_bb": 97.4 or null,
  "blinds": "0.02/0.05",
  "big_blind_dollar": 0.05,
  "advice": {
    "action": "fold" | "call" | "raise" | "check" | "bet" | "allin",
    "sizing_bb": 8.5 or null,
    "reasoning": "2-3 sentences referencing specific cards, position, stack depth, and opponent type if known",
    "exploit_note": "specific exploitative adjustment if opponent profile warrants it" or null,
    "confidence": "high" | "medium" | "low"
  }
}`;

  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    },
    { type: 'text', text: userText },
  ];
}

// ─── Parse response ───────────────────────────────────────────────────────────

function parseResponse(raw: any): { gameState: GameState; advice: AdviceResult | null } {
  const players = (raw.players_in_hand || []) as any[];

  const gameState: GameState = {
    hero_cards: raw.hero_cards || null,
    hero_position: raw.hero_position || null,
    board_cards: raw.board_cards || [],
    street: raw.street || null,
    pot_size_bb: raw.pot_size_bb ?? null,
    pot_type: raw.pot_type || null,
    players_remaining_in_hand: raw.players_remaining_in_hand ?? null,
    action_facing: raw.action_facing || null,
    amount_to_call_bb: raw.amount_to_call_bb ?? null,
    action_history: raw.action_history || [],
    players_in_hand: players,
    players_folded: raw.players_folded || [],
    aggressor_name: raw.aggressor_name || null,
    aggressor_amount_bb: raw.aggressor_amount_bb ?? null,
    effective_stack_bb: raw.effective_stack_bb ?? null,
    blinds: raw.blinds || null,
    big_blind_dollar: raw.big_blind_dollar ?? null,
  };

  const a = raw.advice;
  const advice: AdviceResult | null =
    a && gameState.hero_cards
      ? {
          action: a.action || 'WAIT',
          sizing_bb: a.sizing_bb ?? null,
          reasoning: a.reasoning || '',
          exploit_note: a.exploit_note || null,
          confidence: a.confidence || 'low',
        }
      : null;

  return { gameState, advice };
}

// ─── Null field detection ─────────────────────────────────────────────────────

function detectNullFields(gameState: GameState): string[] {
  const critical: (keyof GameState)[] = [
    'hero_cards',
    'hero_position',
    'street',
    'action_facing',
    'pot_size_bb',
  ];
  return critical.filter(f => {
    const v = gameState[f];
    return v == null || (Array.isArray(v) && v.length === 0);
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeAndAdvise(
  apiKey: string,
  frameDataUrl: string,
  config: SessionConfig,
  playerProfiles: PlayerProfile[],
  similarHands: HandRecord[]
): Promise<{
  gameState: GameState;
  advice: AdviceResult | null;
  nullFields: string[];
  tokens: number;
  raw: any;
}> {
  const systemPrompt = buildSystemPrompt(config);
  const userContent = buildUserMessage(frameDataUrl, playerProfiles, similarHands);

  const result = await callClaude(apiKey, systemPrompt, userContent);

  // Extract JSON from response
  const jsonMatch = result.text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude returned no valid JSON. Raw: ' + result.text.slice(0, 200));

  let raw: any;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error('Failed to parse Claude JSON: ' + jsonMatch[0].slice(0, 200));
  }

  const { gameState, advice } = parseResponse(raw);
  const nullFields = detectNullFields(gameState);
  const tokens = result.inputTokens + result.outputTokens;

  return { gameState, advice, nullFields, tokens, raw };
}
