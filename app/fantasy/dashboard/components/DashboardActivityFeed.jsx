"use client";

import { useMemo } from "react";
import ActivityFeedItem from "./ActivityFeedItem";

/**
 * DashboardActivityFeed - Derives and displays Fantasy League activity from existing data
 *
 * Derives feed items from:
 * - standings: Manager rankings, points, round performance
 * - roundStats: Current tournament round info
 * - playerStats: Player performance data
 */

// Helper: Get current round label
function getCurrentRoundLabel(roundStats) {
  if (!roundStats?.rounds) return null;

  const roundKeys = Object.keys(roundStats.rounds);
  if (!roundKeys.length) return null;

  const latestRound = roundKeys[roundKeys.length - 1];
  const roundMap = {
    g1: "Group Stage • Matchday 1",
    g2: "Group Stage • Matchday 2",
    g3: "Group Stage • Matchday 3",
    r32: "Round of 16",
    r16: "Quarterfinals",
    qf: "Quarterfinals",
    sf: "Semifinals",
    f: "Final",
  };

  return roundMap[latestRound] || null;
}

// Helper: Derive feed items from standings
function deriveFeedItems(standings, roundStats) {
  const items = [];

  if (!standings || standings.length === 0) {
    return items;
  }

  // 1. League Leader (if we have standings)
  const leader = standings[0];
  if (leader?.manager) {
    items.push({
      id: "leader",
      icon: "trending_up",
      iconColor: "text-primary",
      title: `${leader.manager} leads the league`,
      description: `Currently in 1st place with ${leader.totalPoints || 0} total points`,
      value: `#1`,
      valueLabel: "Rank",
      variant: "highlight",
    });
  }

  // 2. Highest Scorer This Round (if roundPoints available)
  let topRoundScorer = null;
  let maxRoundPoints = -1;

  for (const manager of standings) {
    if (manager.roundPoints > maxRoundPoints) {
      maxRoundPoints = manager.roundPoints;
      topRoundScorer = manager;
    }
  }

  if (topRoundScorer && topRoundScorer.roundPoints > 0) {
    items.push({
      id: "top-round-scorer",
      icon: "star",
      iconColor: "text-tertiary",
      title: `${topRoundScorer.manager} tops this round`,
      description: `Scored ${topRoundScorer.roundPoints} points in the latest matchday`,
      value: `${topRoundScorer.roundPoints}`,
      valueLabel: "Points",
      variant: "default",
    });
  }

  // 3. Biggest Rank Climber (if roundRank is less than rank = climbed up)
  let rankClimber = null;
  let maxClimb = 0;

  for (const manager of standings) {
    const climb = (manager.roundRank || Infinity) - (manager.rank || 0);
    if (climb > maxClimb && manager.rank && manager.roundRank) {
      maxClimb = climb;
      rankClimber = manager;
    }
  }

  if (rankClimber && maxClimb > 0) {
    items.push({
      id: "rank-climber",
      icon: "arrow_upward",
      iconColor: "text-primary",
      title: `${rankClimber.manager} climbs rankings`,
      description: `Moved up from position ${rankClimber.roundRank} to ${rankClimber.rank} this round`,
      value: `↑${maxClimb}`,
      valueLabel: "Positions",
      variant: "default",
    });
  }

  // 4. Close Competition (if top 3 are within 10 points)
  if (standings.length >= 2) {
    const topPoints = standings[0].totalPoints || 0;
    const secondPoints = standings[1].totalPoints || 0;
    const gap = topPoints - secondPoints;

    if (gap > 0 && gap <= 10) {
      items.push({
        id: "close-race",
        icon: "sports_competition",
        iconColor: "text-tertiary",
        title: "Intense competition at the top",
        description: `${standings[0].manager} leads ${standings[1].manager} by just ${gap} points`,
        value: `${gap}`,
        valueLabel: "Points gap",
        variant: "default",
      });
    }
  }

  // 5. Current Round Info (if available)
  const currentRound = getCurrentRoundLabel(roundStats);
  if (currentRound) {
    items.push({
      id: "current-round",
      icon: "calendar_today",
      iconColor: "text-on-surface-variant",
      title: "Current tournament stage",
      description: currentRound,
      variant: "info",
    });
  }

  return items;
}

export default function DashboardActivityFeed({
  standings = [],
  roundStats = null,
  playerStats = null,
}) {
  const feedItems = useMemo(
    () => deriveFeedItems(standings, roundStats),
    [standings, roundStats]
  );

  if (feedItems.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">feed</span>
          Activity Feed
        </div>
        <div className="px-6 py-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant inline-block mb-3">
            info
          </span>
          <p className="text-sm text-on-surface-variant">
            No activity data available yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">feed</span>
        Activity Feed
      </div>

      {/* Feed items */}
      <div className="px-6 py-4 space-y-3">
        {feedItems.map((item) => (
          <ActivityFeedItem
            key={item.id}
            icon={item.icon}
            iconColor={item.iconColor}
            title={item.title}
            description={item.description}
            value={item.value}
            valueLabel={item.valueLabel}
            variant={item.variant}
          />
        ))}
      </div>
    </div>
  );
}
