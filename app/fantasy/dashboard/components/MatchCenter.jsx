"use client";

import { useMemo } from "react";
import MatchCard from "./MatchCard";

/**
 * MatchCenter - Displays match timeline (2 finished + 2 upcoming)
 * Chronological order: shows 2 before first upcoming + 2 from that point
 */

// Helper: Get all matches from schedule in chronological order
function getAllMatches(schedule) {
  const matches = [];
  if (!schedule || typeof schedule !== "object") return matches;

  for (const stageName in schedule) {
    const stage = schedule[stageName];
    if (stage?.matches && typeof stage.matches === "object") {
      for (const roundName in stage.matches) {
        const roundMatches = stage.matches[roundName];
        if (Array.isArray(roundMatches)) {
          matches.push(
            ...roundMatches.map((m) => ({...m, stageName, roundName}))
          );
        }
      }
    }
  }
  return matches;
}

// Helper: Convert Vietnamese date "6 tháng 7, 2026" to ISO "2026-07-06"
function parseVietnameseDate(dateStr) {
  const parts = dateStr.split(" ");
  const day = String(parts[0]).padStart(2, "0");
  const month = String(parts[2].replace(",", "")).padStart(2, "0");
  const year = parts[3];
  return `${year}-${month}-${day}`;
}

// Helper: Get matches from current date onwards, sorted chronologically
function getMatchesFromToday(allMatches) {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Filter matches from today onwards
  const filtered = allMatches.filter((match) => {
    const matchDate = parseVietnameseDate(match.date);
    return matchDate >= today;
  });

  // Sort by date chronologically (earliest first)
  return filtered.sort((a, b) => {
    const dateA = parseVietnameseDate(a.date);
    const dateB = parseVietnameseDate(b.date);
    return dateA.localeCompare(dateB);
  });
}

export default function MatchCenter({ schedule = null }) {
  const displayMatches = useMemo(() => {
    if (!schedule) return { matches: [] };

    const allMatches = getAllMatches(schedule);
    if (allMatches.length === 0) return { matches: [] };

    // Get matches from today onwards
    const matchesFromToday = getMatchesFromToday(allMatches);
    if (matchesFromToday.length === 0) return { matches: [] };

    // Find first match with no scores (upcoming match)
    const firstUpcomingIndex = matchesFromToday.findIndex(
      (m) => m.homeScore === null && m.awayScore === null
    );

    // If no upcoming matches, return empty
    if (firstUpcomingIndex === -1) {
      return { matches: [] };
    }

    // Show 2 before + 2 from that index (4 total)
    const startIndex = Math.max(0, firstUpcomingIndex - 2);
    const matches = matchesFromToday.slice(startIndex, startIndex + 4);

    return { matches };
  }, [schedule]);

  if (displayMatches.matches.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">sports_soccer</span>
          Match Center
        </div>
        <div className="px-6 py-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant inline-block mb-3">
            calendar_today
          </span>
          <p className="text-sm text-on-surface-variant">No matches available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">sports_soccer</span>
        Match Center
      </div>

      {/* Title */}
      <div className="px-6 pt-4 pb-2">
        <h3 className="text-sm font-label-large text-on-surface">
          Match Timeline
        </h3>
      </div>

      {/* Matches grid */}
      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
        {displayMatches.matches.map((match) => {
          // Determine status based on scores
          const hasScores = match.homeScore !== null && match.awayScore !== null;
          const status = hasScores ? "completed" : "scheduled";

          return (
            <MatchCard
              key={match.id}
              homeCode={match.homeCode}
              awayCode={match.awayCode}
              homeFlag={match.homeFlag}
              awayFlag={match.awayFlag}
              time={match.time}
              date={match.date}
              group={match.group}
              status={status}
              homeScore={match.homeScore}
              awayScore={match.awayScore}
            />
          );
        })}
      </div>
    </div>
  );
}
