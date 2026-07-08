"use client";

import { useMemo } from "react";

// Helper: Get current round key from roundStats
function getCurrentRoundKey(roundStats) {
  if (!roundStats?.rounds || typeof roundStats.rounds !== "object") return null;
  const roundKeys = Object.keys(roundStats.rounds);
  return roundKeys.length > 0 ? roundKeys[roundKeys.length - 1] : null;
}

// Helper: Extract current round from standings and roundStats
function getCurrentRound(standings, roundStats) {
  if (!roundStats?.rounds) return null;
  
  // Find the latest round with data (reverse order to get most recent)
  const roundKeys = Object.keys(roundStats.rounds).reverse();
  const currentRoundKey = roundKeys[0];
  
  if (!currentRoundKey) return null;
  
  // Map round key to display label
  const roundLabels = {
    "g1": "Group Stage • Matchday 1",
    "g2": "Group Stage • Matchday 2",
    "g3": "Group Stage • Matchday 3",
    "r32": "Round of 32",
    "r16": "Round of 16",
    "qf": "Quarterfinals",
    "sf": "Semifinals",
    "f": "Final",
  };
  
  return roundLabels[currentRoundKey] || currentRoundKey;
}

// Helper: Get round matches progress
function getRoundMatchesProgress(roundStats) {
  if (!roundStats?.rounds) return null;
  
  const roundKeys = Object.keys(roundStats.rounds);
  const currentRoundKey = roundKeys[roundKeys.length - 1];
  
  if (!currentRoundKey) return null;
  
  const roundData = roundStats.rounds[currentRoundKey];
  if (!roundData) return null;
  
  // Count total and played matches
  const total = roundData.totalMatches || 0;
  const played = roundData.playedMatches || 0;
  
  return { played, total };
}

// Helper: Get round leader from standings for the current round
function getRoundLeader(standings, roundStats) {
  if (!standings || standings.length === 0 || !roundStats?.rounds) return null;
  
  // Get current round key
  const roundKeys = Object.keys(roundStats.rounds);
  if (roundKeys.length === 0) return null;
  const currentRoundKey = roundKeys[roundKeys.length - 1];
  
  // Find manager with highest points in current round
  let roundLeader = null;
  let maxRoundPoints = 0;
  
  standings.forEach((manager) => {
    const roundPoints = manager.rounds?.[currentRoundKey] ?? 0;
    if (roundPoints > maxRoundPoints) {
      maxRoundPoints = roundPoints;
      roundLeader = manager;
    }
  });
  
  return roundLeader && maxRoundPoints > 0 ? roundLeader : null;
}

// Helper: Format last synced timestamp
function formatLastSynced(iso) {
  if (!iso) return null;
  
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    const p = (x) => String(x).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return null;
  }
}

// Helper: Get tournament leader from standings
function getTournamentLeader(standings) {
  return standings?.[0] || null;
}

// Helper: Get manager count
function getManagerCount(standings) {
  return standings?.length || 0;
}

// Avatar component
function Avatar({ src, name, size = "w-16 h-16" }) {
  return (
    <div className={`${size} rounded-full bg-white border-2 border-primary overflow-hidden flex items-center justify-center shrink-0`}>
      {src ? (
        <img src={src} alt="" className="w-full h-full object-contain p-1" />
      ) : (
        <span className="font-data-mono text-sm text-on-surface-variant font-bold">
          {(name || "?").trim()[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function DashboardHero({ standings = [], roundStats = null, playerStats = null }) {
  const computedData = useMemo(() => {
    const tournamentLeader = getTournamentLeader(standings);
    const roundLeader = getRoundLeader(standings, roundStats);
    const managerCount = getManagerCount(standings);
    const currentRound = getCurrentRound(standings, roundStats);
    const currentRoundKey = getCurrentRoundKey(roundStats);
    const matchesProgress = getRoundMatchesProgress(roundStats);
    const lastSynced = formatLastSynced(playerStats?.updated);
    
    return { tournamentLeader, roundLeader, managerCount, currentRound, currentRoundKey, matchesProgress, lastSynced };
  }, [standings, roundStats, playerStats]);

  const { tournamentLeader, roundLeader, managerCount, currentRound, currentRoundKey, matchesProgress, lastSynced } = computedData;

  return (
    <div className="bg-gradient-to-br from-primary/10 to-tertiary/5 border border-primary/20 rounded-2xl overflow-hidden mb-8">
      {/* Header: Title + Meta */}
      <div className="px-6 py-5 border-b border-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg text-headline-md text-on-surface">Fantasy League</h1>
            <p className="text-sm text-on-surface-variant mt-1">FIFA World Cup 2026</p>
          </div>
          
          {/* Meta: Round + Sync */}
          <div className="flex flex-wrap gap-4 text-sm">
            {currentRound && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                <span className="text-on-surface-variant text-xs">{currentRound.split(" • ")[0]}</span>
              </div>
            )}
            
            {lastSynced && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">update</span>
                <span className="text-on-surface-variant text-xs">Synced {lastSynced}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content: Two-column layout */}
      {tournamentLeader ? (
        <div className="px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Tournament Leader - Large */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">🏆</span>
                <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Tournament Leader</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <Avatar src={tournamentLeader.avatar} name={tournamentLeader.manager} size="w-16 h-16" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-lg text-on-surface truncate">{tournamentLeader.manager}</div>
                  {tournamentLeader.team && (
                    <div className="text-xs text-on-surface-variant mt-0.5 truncate">{tournamentLeader.team}</div>
                  )}
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg border border-outline-variant px-4 py-4">
                <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Total Points</div>
                <div className="text-3xl font-bold text-primary mt-2">{tournamentLeader.totalPoints}</div>
              </div>
            </div>

            {/* Right: KPI Cards Stack */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Round Leader */}
              <div className="bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="text-lg shrink-0 pt-0.5">🔥</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Round Leader</div>
                    {roundLeader && currentRoundKey ? (
                      <>
                        <div className="font-semibold text-on-surface mt-1 truncate">{roundLeader.manager}</div>
                        <div className="text-sm font-bold text-tertiary mt-1">
                          {roundLeader.rounds?.[currentRoundKey] || 0} pts
                        </div>
                      </>
                    ) : (
                      <div className="text-on-surface-variant text-sm mt-1">No data yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Managers KPI */}
              <div className="bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="text-lg shrink-0 pt-0.5">👥</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Managers</div>
                    <div className="text-2xl font-bold text-tertiary mt-1">{managerCount}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">Active Managers</div>
                  </div>
                </div>
              </div>

              {/* Current Round */}
              <div className="bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="text-lg shrink-0 pt-0.5">⚽</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Current Round</div>
                    <div className="font-semibold text-on-surface mt-1">{currentRound ? currentRound.split(" • ")[0] : "N/A"}</div>
                    {matchesProgress && (
                      <div className="text-xs text-on-surface-variant mt-1">
                        {matchesProgress.played} / {matchesProgress.total} Matches Played
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant inline-block">query_stats</span>
          <p className="mt-3 text-sm text-on-surface-variant">No standings data available</p>
        </div>
      )}
    </div>
  );
}
