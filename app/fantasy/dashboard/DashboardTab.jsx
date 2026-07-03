"use client";

import DashboardHero from "./components/DashboardHero";
import DashboardActivityFeed from "./components/DashboardActivityFeed";

export default function DashboardTab({ standings = [], squads = {}, squadsByRound = {}, roundStats = null, playerStats = null }) {
  return (
    <div className="space-y-8">
      {/* Hero: League info, current leader, manager count */}
      <DashboardHero standings={standings} roundStats={roundStats} playerStats={playerStats} />

      {/* Activity Feed: Recent Fantasy League events */}
      <DashboardActivityFeed standings={standings} roundStats={roundStats} playerStats={playerStats} />
    </div>
  );
}
