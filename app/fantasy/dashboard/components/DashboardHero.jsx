"use client";

import { useMemo } from "react";

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
    "r32": "Round of 16",
    "r16": "Quarterfinals",
    "qf": "Quarterfinals",
    "sf": "Semifinals",
    "f": "Final",
  };
  
  return roundLabels[currentRoundKey] || currentRoundKey;
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

// Helper: Get leader info from standings
function getLeader(standings) {
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
    const leader = getLeader(standings);
    const managerCount = getManagerCount(standings);
    const currentRound = getCurrentRound(standings, roundStats);
    const lastSynced = formatLastSynced(playerStats?.updated);
    
    return { leader, managerCount, currentRound, lastSynced };
  }, [standings, roundStats, playerStats]);

  const { leader, managerCount, currentRound, lastSynced } = computedData;

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
                <span className="text-on-surface-variant">{currentRound}</span>
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

      {/* Leader Section */}
      {leader ? (
        <div className="px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Leader Avatar + Info */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Avatar src={leader.avatar} name={leader.manager} size="w-20 h-20" />
              <div className="min-w-0">
                <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Current Leader</div>
                <div className="font-bold text-lg text-on-surface mt-1 truncate">{leader.manager}</div>
                {leader.team && (
                  <div className="text-xs text-on-surface-variant mt-0.5 truncate">{leader.team}</div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 flex-grow">
              <div className="bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3">
                <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Points</div>
                <div className="text-2xl font-bold text-primary mt-1">{leader.totalPoints}</div>
              </div>
              
              <div className="bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3">
                <div className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wide">Managers</div>
                <div className="text-2xl font-bold text-tertiary mt-1">{managerCount}</div>
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
