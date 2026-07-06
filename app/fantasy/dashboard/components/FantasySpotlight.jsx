"use client";

import { useMemo } from "react";
import SpotlightCard from "./SpotlightCard";

/**
 * FantasySpotlight - Displays interesting fantasy insights from existing data
 *
 * Props:
 * - roundStats: Player performance data by round
 * - standings: Manager standings with ranks
 * - squadsByRound: Manager squads by round (to identify captains/stars)
 */

// Helper: Get current round key from roundStats
function getCurrentRoundKey(roundStats) {
  if (!roundStats?.rounds || typeof roundStats.rounds !== "object") {
    return null;
  }

  const roundKeys = Object.keys(roundStats.rounds);
  if (!roundKeys.length) return null;

  return roundKeys[roundKeys.length - 1];
}

// Helper: Get round label from key
function getRoundLabel(key) {
  const roundMap = {
    g1: "Matchday 1",
    g2: "Matchday 2",
    g3: "Matchday 3",
    r32: "Round of 16",
    r16: "Quarterfinals",
    qf: "Quarterfinals",
    sf: "Semifinals",
    f: "Final",
  };
  return roundMap[key] || key;
}

// Helper: Derive spotlight insights from data
function deriveInsights(roundStats, standings) {
  const insights = [];

  if (!roundStats?.rounds) {
    return insights;
  }

  const currentRoundKey = getCurrentRoundKey(roundStats);
  if (!currentRoundKey) return insights;

  const roundLabel = getRoundLabel(currentRoundKey);
  const roundData = roundStats.rounds[currentRoundKey];

  if (!roundData || typeof roundData !== "object") {
    return insights;
  }

  // 1. Player of the Round (highest rating)
  let topRatedPlayer = null;
  let topRating = -1;

  for (const [playerKey, playerData] of Object.entries(roundData)) {
    const rating = playerData.rating;
    if (rating && rating > topRating) {
      topRating = rating;
      topRatedPlayer = { key: playerKey, ...playerData };
    }
  }

  if (topRatedPlayer && topRating >= 6) {
    const [teamCode, playerName] = topRatedPlayer.key.split(":");
    insights.push({
      id: "player-of-round",
      type: "player",
      icon: "sports_soccer",
      iconColor: "text-primary",
      title: "Player of the Round",
      subtitle: roundLabel,
      value: playerName || "Unknown",
      valueDetail: `${topRating.toFixed(2)} rating • ${topRatedPlayer.minutes || 0} min`,
      secondaryValue: topRatedPlayer.goals ? `${topRatedPlayer.goals} goal${topRatedPlayer.goals !== 1 ? "s" : ""}` : null,
      variant: "highlight",
    });
  }

  // 2. Top Goal Scorer (Round)
  let topScorer = null;
  let topGoals = -1;

  for (const [playerKey, playerData] of Object.entries(roundData)) {
    const goals = playerData.goals || 0;
    if (goals > topGoals) {
      topGoals = goals;
      topScorer = { key: playerKey, ...playerData };
    }
  }

  if (topScorer && topGoals > 0) {
    const [teamCode, playerName] = topScorer.key.split(":");
    insights.push({
      id: "top-scorer-round",
      type: "player",
      icon: "workspace_premium",
      iconColor: "text-tertiary",
      title: "Top Scorer",
      subtitle: roundLabel,
      value: playerName || "Unknown",
      valueDetail: `${topGoals} goal${topGoals !== 1 ? "s" : ""}`,
      secondaryValue: topScorer.assists ? `${topScorer.assists} assist${topScorer.assists !== 1 ? "s" : ""}` : null,
      variant: "default",
    });
  }

  // 3. Top Playmaker (most assists)
  let topPlaymaker = null;
  let topAssists = -1;

  for (const [playerKey, playerData] of Object.entries(roundData)) {
    const assists = playerData.assists || 0;
    if (assists > topAssists) {
      topAssists = assists;
      topPlaymaker = { key: playerKey, ...playerData };
    }
  }

  if (topPlaymaker && topAssists > 0) {
    const [teamCode, playerName] = topPlaymaker.key.split(":");
    insights.push({
      id: "top-playmaker",
      type: "player",
      icon: "assist",
      iconColor: "text-primary",
      title: "Top Playmaker",
      subtitle: roundLabel,
      value: playerName || "Unknown",
      valueDetail: `${topAssists} assist${topAssists !== 1 ? "s" : ""}`,
      secondaryValue: topPlaymaker.goals ? `${topPlaymaker.goals} goal${topPlaymaker.goals !== 1 ? "s" : ""}` : null,
      variant: "default",
    });
  }

  // 4. Man of the Match
  for (const [playerKey, playerData] of Object.entries(roundData)) {
    if (playerData.motm) {
      const [teamCode, playerName] = playerKey.split(":");
      insights.push({
        id: "motm",
        type: "player",
        icon: "grade",
        iconColor: "text-tertiary",
        title: "Man of the Match",
        subtitle: roundLabel,
        value: playerName || "Unknown",
        valueDetail: `${playerData.rating || 0} rating • ${playerData.minutes || 0} min`,
        variant: "stat",
      });
      break; // Only show first motm
    }
  }

  // 5. Biggest Rank Climber (from standings)
  if (standings && standings.length > 0) {
    let rankClimber = null;
    let maxClimb = 0;

    for (const manager of standings) {
      const climb = (manager.roundRank || Infinity) - (manager.rank || 0);
      if (climb > maxClimb && manager.rank && manager.roundRank) {
        maxClimb = climb;
        rankClimber = manager;
      }
    }

    if (rankClimber && maxClimb > 2) {
      insights.push({
        id: "rank-climber",
        type: "manager",
        icon: "trending_up",
        iconColor: "text-primary",
        title: "Biggest Climber",
        subtitle: "Rank improvement",
        value: rankClimber.manager || "Unknown",
        valueDetail: `↑ ${maxClimb} positions (now #${rankClimber.rank})`,
        variant: "default",
      });
    }
  }

  // 6. Round Leader (highest scorer this round)
  if (standings && standings.length > 0) {
    const roundLeader = standings[0];
    if (roundLeader && roundLeader.roundPoints > 0) {
      insights.push({
        id: "round-leader",
        type: "manager",
        icon: "emoji_events",
        iconColor: "text-tertiary",
        title: "Round Leader",
        subtitle: "Highest score",
        value: roundLeader.manager || "Unknown",
        valueDetail: `${roundLeader.roundPoints} points`,
        variant: "stat",
      });
    }
  }

  return insights;
}

export default function FantasySpotlight({ roundStats = null, standings = [], squadsByRound = {} }) {
  const insights = useMemo(
    () => deriveInsights(roundStats, standings),
    [roundStats, standings]
  );

  if (insights.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">highlight</span>
          Fantasy Spotlight
        </div>
        <div className="px-6 py-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant inline-block mb-3">
            lightbulb
          </span>
          <p className="text-sm text-on-surface-variant">
            No insights available yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">highlight</span>
        Fantasy Spotlight
      </div>

      {/* Insights grid */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <SpotlightCard
            key={insight.id}
            icon={insight.icon}
            iconColor={insight.iconColor}
            title={insight.title}
            subtitle={insight.subtitle}
            value={insight.value}
            valueDetail={insight.valueDetail}
            secondaryValue={insight.secondaryValue}
            variant={insight.variant}
          />
        ))}
      </div>
    </div>
  );
}
