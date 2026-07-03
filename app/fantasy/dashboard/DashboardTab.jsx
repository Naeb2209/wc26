"use client";

export default function DashboardTab({ standings = [], squads = {}, squadsByRound = {}, roundStats = null, playerStats = null }) {
  return (
    <div className="space-y-8">
      {/* Main Dashboard Card */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">analytics</span>
          Dashboard
        </div>
        <div className="px-6 py-8">
          <p className="text-lg text-on-surface font-bold mb-6">
            This will become the new Fantasy dashboard.
          </p>

          <div className="space-y-4">
            <div className="text-on-surface-variant text-sm leading-relaxed">
              <p className="font-semibold text-on-surface mb-3">Future sections</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>League Overview</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Tournament Bracket</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Match Center</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Fantasy Insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Awards</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
