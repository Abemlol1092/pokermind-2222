import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, AdviceResult, PlayerProfile, HandRecord, SessionStats, SessionConfig, AppPhase } from '@/types/poker';
import { ScreenCapture } from '@/lib/screenCapture';
import { analyzeAndAdvise } from '@/lib/claudeApi';
import { updateProfilesFromHand, getAllProfiles, getProfilesForPlayers } from '@/lib/playerTracker';
import { saveHand, getRecentHands, findSimilarHands } from '@/lib/handHistory';
import SessionModal from '@/components/SessionModal';
import GameStatePanel from '@/components/GameStatePanel';
import AdvicePanel from '@/components/AdvicePanel';
import PlayerProfilesPanel from '@/components/PlayerProfilesPanel';
import HandHistoryLog from '@/components/HandHistoryLog';
import RawJsonPanel from '@/components/RawJsonPanel';

// Cost per token (claude-sonnet-4)
const COST_PER_TOKEN = 0.000003;
// Cooldown after each analysis (ms) — prevents double-firing
const COOLDOWN_MS = 4000;

const PHASE_LABELS: Record<AppPhase, { label: string; color: string; dot: string }> = {
  idle:         { label: 'Session stopped',         color: 'text-[#3a5a6a]', dot: 'bg-[#3a5a6a]' },
  running:      { label: 'Monitoring — press Space', color: 'text-[#00d4aa]', dot: 'bg-[#00d4aa] animate-pulse' },
  capturing:    { label: 'Capturing frame...',       color: 'text-yellow-400', dot: 'bg-yellow-400' },
  analyzing:    { label: 'Sending to Claude AI...',  color: 'text-blue-400',  dot: 'bg-blue-400 animate-pulse' },
  advice_ready: { label: 'Advice ready',             color: 'text-[#00d4aa]', dot: 'bg-[#00d4aa]' },
  cooldown:     { label: 'Cooldown — waiting...',    color: 'text-[#5a7a9a]', dot: 'bg-[#5a7a9a]' },
};

export default function Index() {
  // ── API key ──────────────────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('pokermind_api_key') || '');
  const saveApiKey = (k: string) => {
    setApiKey(k);
    localStorage.setItem('pokermind_api_key', k);
  };

  // ── Session state ────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [config, setConfig] = useState<SessionConfig>(() => {
    try {
      const s = localStorage.getItem('pokermind_config');
      return s ? JSON.parse(s) : { tableSize: 6, cardTheme: '2color', bigBlindDollar: 0.05, adviceMode: 'balanced' };
    } catch {
      return { tableSize: 6, cardTheme: '2color', bigBlindDollar: 0.05, adviceMode: 'balanced' };
    }
  });

  // ── Analysis state ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [nullFields, setNullFields] = useState<string[]>([]);
  const [rawJson, setRawJson] = useState<any>(null);
  const [profiles, setProfiles] = useState<PlayerProfile[]>(() => getAllProfiles());
  const [handHistory, setHandHistory] = useState<HandRecord[]>(() => getRecentHands(30));
  const [stats, setStats] = useState<SessionStats>({
    handsAnalyzed: 0, apiCalls: 0, totalTokens: 0, estimatedCost: 0,
  });

  // ── Refs ─────────────────────────────────────────────────────────────────
  const capture = useRef(new ScreenCapture());
  const apiKeyRef = useRef(apiKey);
  const configRef = useRef(config);
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { configRef.current = config; }, [config]);

  // ── Core analysis function ───────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (processingRef.current) return;
    if (!capture.current.isReady()) {
      console.warn('Capture not ready');
      return;
    }

    processingRef.current = true;
    setPhase('capturing');

    // Small settle delay — let GGPoker UI fully render
    await new Promise(r => setTimeout(r, 600));

    const frame = capture.current.captureFrame();
    if (!frame) {
      processingRef.current = false;
      setPhase('running');
      return;
    }

    setPhase('analyzing');

    try {
      // Get relevant player profiles and similar hands for context
      const allPlayerNames = gameState?.players_in_hand.map(p => p.name) ?? [];
      const relevantProfiles = getProfilesForPlayers(allPlayerNames);
      const similarHands = findSimilarHands(gameState ?? ({} as GameState));

      const result = await analyzeAndAdvise(
        apiKeyRef.current,
        frame,
        configRef.current,
        relevantProfiles,
        similarHands,
      );

      setGameState(result.gameState);
      setAdvice(result.advice);
      setNullFields(result.nullFields);
      setRawJson(result.raw);

      // Update stats
      const cost = result.tokens * COST_PER_TOKEN;
      setStats(s => ({
        handsAnalyzed: s.handsAnalyzed + 1,
        apiCalls: s.apiCalls + 1,
        totalTokens: s.totalTokens + result.tokens,
        estimatedCost: s.estimatedCost + cost,
      }));

      // Save to history & update profiles
      if (result.advice && result.gameState.hero_cards?.length) {
        saveHand(result.gameState, result.advice.action, result.advice.reasoning);
        setHandHistory(getRecentHands(30));
      }

      const updatedProfiles = updateProfilesFromHand(result.gameState);
      setProfiles(updatedProfiles);

      setPhase('advice_ready');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAdvice(null);
      setNullFields(['API error: ' + err.message]);
      setPhase('running');
    } finally {
      // Cooldown before allowing next analysis
      await new Promise(r => setTimeout(r, COOLDOWN_MS));
      processingRef.current = false;
      if (isRunning) setPhase('running');
    }
  }, [gameState, isRunning]);

  // ── Keyboard trigger ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Space or 'A' key triggers analysis
      if (!isRunning) return;
      if (e.code === 'Space' || e.code === 'KeyA') {
        e.preventDefault();
        analyze();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRunning, analyze]);

  // ── Session start / stop ──────────────────────────────────────────────────
  const startSession = useCallback(async (cfg: SessionConfig) => {
    if (!apiKey.trim()) {
      alert('Please enter your Claude API key first');
      return;
    }
    setConfig(cfg);
    localStorage.setItem('pokermind_config', JSON.stringify(cfg));
    setShowModal(false);

    try {
      const stream = await capture.current.start();
      streamRef.current = stream;

      // Reset session state
      setPhase('running');
      setIsRunning(true);
      setGameState(null);
      setAdvice(null);
      setNullFields([]);
      setRawJson(null);
      setStats({ handsAnalyzed: 0, apiCalls: 0, totalTokens: 0, estimatedCost: 0 });

      // If user closes screen share from browser UI
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopSession();
      });
    } catch (err: any) {
      alert('Screen capture failed: ' + err.message);
    }
  }, [apiKey]);

  const stopSession = useCallback(() => {
    capture.current.stop();
    streamRef.current = null;
    setIsRunning(false);
    setPhase('idle');
    processingRef.current = false;
  }, []);

  // ── UI ────────────────────────────────────────────────────────────────────
  const phaseInfo = PHASE_LABELS[phase];

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-[#080e14] text-white"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1a2a3a] bg-[#0a1520] flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span className="text-[#00d4aa] text-lg font-black tracking-tight">POKER</span>
            <span className="text-white text-lg font-black tracking-tight">MIND</span>
            <span className="text-[#3a5a6a] text-xs ml-1 font-normal">AI</span>
          </div>

          {/* Session badge */}
          {isRunning && (
            <div className="flex items-center gap-1.5 bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-1">
              <span className="text-[#5a7a9a] text-xs">
                {config.tableSize}-max · ${(config.bigBlindDollar / 2).toFixed(2)}/${config.bigBlindDollar.toFixed(2)}
              </span>
            </div>
          )}

          {/* Phase indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${phaseInfo.dot}`} />
            <span className={`text-xs ${phaseInfo.color}`}>{phaseInfo.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          {isRunning && (
            <div className="flex items-center gap-4 text-xs text-[#3a5a6a] mr-2">
              <span>Hands: <span className="text-[#5a7a9a]">{stats.handsAnalyzed}</span></span>
              <span>Tokens: <span className="text-[#5a7a9a]">{stats.totalTokens.toLocaleString()}</span></span>
              <span>Cost: <span className="text-[#5a7a9a]">${stats.estimatedCost.toFixed(4)}</span></span>
            </div>
          )}

          {/* API key */}
          <input
            type="password"
            placeholder="Claude API Key"
            value={apiKey}
            onChange={e => saveApiKey(e.target.value)}
            className="bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-1.5 text-xs font-mono w-44 text-white placeholder:text-[#2a3a4a] focus:outline-none focus:border-[#00d4aa]/50"
          />

          {/* Start/Stop */}
          <button
            onClick={isRunning ? stopSession : () => setShowModal(true)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              isRunning
                ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                : 'bg-[#00d4aa] text-black hover:bg-[#00bfa0]'
            }`}
          >
            {isRunning ? 'Stop Session' : 'Start Session'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel: Capture preview + Analyze button ── */}
        <div className="w-[55%] flex flex-col border-r border-[#1a2a3a]">
          {/* Screen preview */}
          <div className="flex-1 relative bg-[#060c12] overflow-hidden">
            {isRunning && capture.current.getStream() ? (
              <video
                ref={el => {
                  if (el && capture.current.getStream()) {
                    el.srcObject = capture.current.getStream();
                    el.play().catch(() => {});
                  }
                }}
                className="w-full h-full object-contain"
                muted
                autoPlay
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="text-[#1a2a3a] text-6xl">♠</div>
                <div className="text-[#2a3a4a] text-sm">Start a session to capture your poker table</div>
              </div>
            )}

            {/* Analyze overlay button */}
            {isRunning && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <button
                  onClick={analyze}
                  disabled={processingRef.current}
                  className={`px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-black/50 ${
                    phase === 'analyzing' || phase === 'capturing'
                      ? 'bg-[#1a2a3a] border border-[#2a3a4a] text-[#3a5a6a] cursor-not-allowed'
                      : 'bg-[#00d4aa] text-black hover:bg-[#00bfa0] active:scale-95'
                  }`}
                >
                  {phase === 'analyzing' ? '⏳ Analyzing...' : phase === 'capturing' ? '📸 Capturing...' : '🔍 Analyze Hand (Space)'}
                </button>
              </div>
            )}
          </div>

          {/* Hand history */}
          <div className="h-44 border-t border-[#1a2a3a] flex-shrink-0">
            <HandHistoryLog hands={handHistory} />
          </div>
        </div>

        {/* ── Right panel: Analysis results ── */}
        <div className="w-[45%] flex flex-col overflow-y-auto bg-[#080e14]">
          <div className="p-4 space-y-3">
            {/* Advice — most prominent */}
            <AdvicePanel advice={advice} isLoading={phase === 'analyzing'} nullFields={nullFields} />

            {/* Game state */}
            <GameStatePanel gameState={gameState} />

            {/* Player profiles */}
            <PlayerProfilesPanel profiles={profiles} />

            {/* Raw JSON (debug) */}
            <RawJsonPanel raw={rawJson} />
          </div>
        </div>
      </div>

      {/* ── Session modal ── */}
      <SessionModal
        isOpen={showModal}
        initial={config}
        onConfirm={startSession}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
