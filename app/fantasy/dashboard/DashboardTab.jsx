"use client";

import DashboardHero from "./components/DashboardHero";
import DashboardActivityFeed from "./components/DashboardActivityFeed";
import MatchCenter from "./components/MatchCenter";

export default function DashboardTab({ standings = [], squads = {}, squadsByRound = {}, roundStats = null, playerStats = null, schedule = null }) {
  return (
    <div className="space-y-8">
      {/* Hero: League info, current leader, manager count */}
      <DashboardHero standings={standings} roundStats={roundStats} playerStats={playerStats} />

      {/* Match Center: Tournament matches with smart priority */}
      <MatchCenter schedule={schedule} />

      {/* Activity Feed: Recent Fantasy League events */}
      <DashboardActivityFeed standings={standings} roundStats={roundStats} playerStats={playerStats} />
    </div>
  );
}
