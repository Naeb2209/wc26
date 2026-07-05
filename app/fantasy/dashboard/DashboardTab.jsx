"use client";

import DashboardHero from "./components/DashboardHero";
import DashboardActivityFeed from "./components/DashboardActivityFeed";
import MatchCenter from "./components/MatchCenter";
import FantasySpotlight from "./components/FantasySpotlight";
import KnockoutBracket from "./components/bracket/KnockoutBracket";

export default function DashboardTab({ standings = [], squads = {}, squadsByRound = {}, roundStats = null, playerStats = null, schedule = null }) {
  return (
    <div className="space-y-8">
      {/* Hero: League info, current leader, manager count */}
      <DashboardHero standings={standings} roundStats={roundStats} playerStats={playerStats} />

      {/* Match Center: Tournament matches with smart priority */}
      <MatchCenter schedule={schedule} />

      {/* Fantasy Spotlight: Interesting insights from player and manager data */}
      <FantasySpotlight roundStats={roundStats} standings={standings} squadsByRound={squadsByRound} />

      {/* Knockout Bracket Preview: Upcoming knockout stage matches */}
      <KnockoutBracket schedule={schedule} />

      {/* Activity Feed: Recent Fantasy League events */}
      <DashboardActivityFeed standings={standings} roundStats={roundStats} playerStats={playerStats} />
    </div>
  );
}
