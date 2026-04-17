import type { PlayerProfile, PlayerClass, GameState } from '@/types/poker';

const STORAGE_KEY = 'pokermind_player_profiles';

function loadProfiles(): Record<string, PlayerProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfiles(profiles: Record<string, PlayerProfile>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}

function classifyPlayer(profile: PlayerProfile): PlayerClass {
  if (profile.hands_observed < 5) return 'unknown';
  const tendencies = profile.tendencies.join(' ').toLowerCase();
  const isAggro =
    tendencies.includes('3bet') ||
    tendencies.includes('raise') ||
    profile.aggression_estimate !== null && profile.aggression_estimate > 0.6;
  const isFish =
    tendencies.includes('limp') ||
    tendencies.includes('call') ||
    tendencies.includes('wide') ||
    tendencies.includes('donk');
  const isNit =
    tendencies.includes('fold') ||
    tendencies.includes('tight') ||
    (profile.vpip_estimate !== null && profile.vpip_estimate < 0.15);

  if (isAggro && !isFish) return 'aggro';
  if (isFish) return 'fish';
  if (isNit) return 'nit';
  return 'reg';
}

export function getAllProfiles(): PlayerProfile[] {
  const profiles = loadProfiles();
  return Object.values(profiles).sort((a, b) => b.last_seen - a.last_seen);
}

export function getProfilesForPlayers(names: string[]): PlayerProfile[] {
  const profiles = loadProfiles();
  return names
    .map(n => profiles[n.toLowerCase()])
    .filter(Boolean);
}

export function updateProfilesFromHand(gameState: GameState): PlayerProfile[] {
  const profiles = loadProfiles();
  const now = Date.now();

  for (const player of gameState.players_in_hand) {
    if (!player.name) continue;
    const key = player.name.toLowerCase();
    const existing = profiles[key] || {
      name: player.name,
      hands_observed: 0,
      classification: 'unknown' as PlayerClass,
      confidence: 'low' as const,
      tendencies: [],
      last_seen: now,
      vpip_estimate: null,
      aggression_estimate: null,
    };

    existing.hands_observed += 1;
    existing.last_seen = now;

    // Record observed actions as tendencies
    if (player.last_action) {
      const tendency = `${player.last_action}`;
      if (!existing.tendencies.includes(tendency)) {
        existing.tendencies = [...existing.tendencies.slice(-19), tendency];
      }
    }

    // Update confidence based on sample size
    if (existing.hands_observed >= 10) existing.confidence = 'high';
    else if (existing.hands_observed >= 5) existing.confidence = 'medium';
    else existing.confidence = 'low';

    existing.classification = classifyPlayer(existing);
    profiles[key] = existing;
  }

  // Also update folded players (they were seen)
  for (const name of gameState.players_folded) {
    const key = name.toLowerCase();
    if (!profiles[key]) {
      profiles[key] = {
        name,
        hands_observed: 1,
        classification: 'unknown',
        confidence: 'low',
        tendencies: ['fold_preflop'],
        last_seen: now,
        vpip_estimate: null,
        aggression_estimate: null,
      };
    } else {
      profiles[key].hands_observed += 1;
      profiles[key].last_seen = now;
      if (!profiles[key].tendencies.includes('fold_preflop')) {
        profiles[key].tendencies = [...profiles[key].tendencies.slice(-19), 'fold_preflop'];
      }
      profiles[key].classification = classifyPlayer(profiles[key]);
    }
  }

  saveProfiles(profiles);
  return Object.values(profiles).sort((a, b) => b.last_seen - a.last_seen);
}

export function clearAllProfiles() {
  localStorage.removeItem(STORAGE_KEY);
}
