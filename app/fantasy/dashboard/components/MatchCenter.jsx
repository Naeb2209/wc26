"use client";

import { useMemo } from "react";
import MatchCard from "./MatchCard";

/**
 * MatchCenter - Displays tournament matches prioritizing today's, then upcoming, then completed
 *
 * Props:
 * - schedule: Tournament schedule data (contains matches by stage and round)
 */

// Configuration for match display
const UPCOMING_MATCH_PREVIEW_COUNT = 4;
const COMPLETED_MATCH_PREVIEW_COUNT = 4;

// Vietnamese month mapping
const MONTH_MAP = {
  tháng1: 1,
  tháng2: 2,
  tháng3: 3,
  tháng4: 4,
  tháng5: 5,
  tháng6: 6,
  tháng7: 7,
  tháng8: 8,
  tháng9: 9,
  tháng10: 10,
  tháng11: 11,
  tháng12: 12,
};

// Helper: Parse Vietnamese date format "DD tháng MM, YYYY" to Date object
function parseVietnameseDate(dateStr) {
  if (!dateStr) return null;

  // Remove extra spaces and normalize
  const normalized = dateStr.replace(/\s+/g, " ").trim();

  // Try to match pattern: "DD tháng MM, YYYY"
  const match = normalized.match(/(\d{1,2})\s+(tháng\d{1,2}),?\s+(\d{4})/);
  if (!match) return null;

  const day = parseInt(match[1]);
  const monthStr = match[2];
  const year = parseInt(match[3]);

  // Find month number
  const monthNum = MONTH_MAP[monthStr];
  if (!monthNum) return null;

  return new Date(year, monthNum - 1, day);
}

// Helper: Check if two dates are the same day (ignoring time)
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Helper: Get all matches from schedule
function getAllMatches(schedule) {
  const matches = [];

  if (!schedule || typeof schedule !== "object") {
    return matches;
  }

  // Iterate through stages (e.g., "Vòng Bảng" = Group Stage)
  for (const stageName in schedule) {
    const stage = schedule[stageName];

    if (stage && stage.matches && typeof stage.matches === "object") {
      // Iterate through rounds (e.g., "Lượt 1", "Lượt 2")
      for (const roundName in stage.matches) {
        const roundMatches = stage.matches[roundName];

        if (Array.isArray(roundMatches)) {
          matches.push(
            ...roundMatches.map((m) => ({
              ...m,
              stageName,
              roundName,
            }))
          );
        }
      }
    }
  }

  return matches;
}

// Helper: Categorize matches by priority
function categorizematches(matches) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const today_matches = [];
  const upcoming_matches = [];
  const completed_matches = [];

  for (const match of matches) {
    const matchDate = parseVietnameseDate(match.date);

    if (!matchDate) {
      // If we can't parse the date, treat as upcoming
      upcoming_matches.push(match);
      continue;
    }

    if (isSameDay(matchDate, today)) {
      today_matches.push(match);
    } else if (matchDate > today) {
      upcoming_matches.push(match);
    } else {
      completed_matches.push(match);
    }
  }

  // Sort each category by date
  const sortByDate = (a, b) => {
    const dateA = parseVietnameseDate(a.date) || new Date();
    const dateB = parseVietnameseDate(b.date) || new Date();
    return dateA - dateB;
  };

  today_matches.sort(sortByDate);
  upcoming_matches.sort(sortByDate);
  completed_matches.sort(sortByDate);

  return { today_matches, upcoming_matches, completed_matches };
}

export default function MatchCenter({ schedule = null }) {
  const displayMatches = useMemo(() => {
    if (!schedule) {
      return {
        matches: [],
        title: "",
        today: [],
        upcoming: [],
        completed: [],
      };
    }

    const allMatches = getAllMatches(schedule);
    const { today_matches, upcoming_matches, completed_matches } = categorizematches(allMatches);

    // Priority: today > upcoming > completed
    let matches = [];
    let title = "";

    if (today_matches.length > 0) {
      matches = today_matches;
      title = `Today's Matches (${today_matches.length})`;
    } else if (upcoming_matches.length > 0) {
      matches = upcoming_matches.slice(0, UPCOMING_MATCH_PREVIEW_COUNT);
      title = `Upcoming Matches (${upcoming_matches.length})`;
    } else if (completed_matches.length > 0) {
      matches = completed_matches.slice(-COMPLETED_MATCH_PREVIEW_COUNT);
      title = `Latest Results (${completed_matches.length})`;
    }

    return {
      matches,
      title,
      today: today_matches,
      upcoming: upcoming_matches,
      completed: completed_matches,
    };
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

      {/* Title showing what matches are displayed */}
      <div className="px-6 pt-4 pb-2">
        <h3 className="text-sm font-label-large text-on-surface">
          {displayMatches.title}
        </h3>
      </div>

      {/* Matches grid */}
      <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
        {displayMatches.matches.map((match) => (
          <MatchCard
            key={match.id}
            homeCode={match.homeCode}
            awayCode={match.awayCode}
            homeFlag={match.homeFlag}
            awayFlag={match.awayFlag}
            time={match.time}
            date={match.date}
            group={match.group}
            status="scheduled"
          />
        ))}
      </div>

      {/* Info footer */}
      <div className="bg-surface-container-highest px-6 py-3 flex items-center gap-2 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">info</span>
        <span>Live badges and knockout stage labels coming soon</span>
      </div>
    </div>
  );
}
