"use client";

import DashboardHero from "./components/DashboardHero";

export default function DashboardTab({ standings = [], squads = {}, squadsByRound = {}, roundStats = null, playerStats = null }) {
  return (
    <div className="space-y-8">
      {/* Hero: League info, current leader, manager count */}
      <DashboardHero standings={standings} roundStats={roundStats} playerStats={playerStats} />

      {/* Future sections */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">info</span>
          Upcoming Features
        </div>
        <div className="px-6 py-8">
          <ul className="space-y-3 text-on-surface-variant text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">•</span>
              <span>Tournament Bracket</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">•</span>
              <span>Match Center</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">•</span>
              <span>Fantasy Insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">•</span>
              <span>Awards</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
