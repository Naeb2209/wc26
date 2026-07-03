"use client";

export default function DashboardTab() {
  return (
    <div className="space-y-8">
      {/* Main Dashboard Card */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">analytics</span>
          📊 Dashboard
        </div>
        <div className="px-6 py-8">
          <p className="text-lg text-on-surface font-bold mb-6">
            This dashboard will become the central hub for Fantasy analytics.
          </p>
          
          <div className="space-y-4">
            <div className="text-on-surface-variant text-sm leading-relaxed">
              <p className="font-semibold text-on-surface mb-3">Future widgets:</p>
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
                  <span>Recent Matches</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Fantasy Insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Awards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Player Trends</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">info</span>
          <div className="text-sm text-on-surface-variant leading-relaxed">
            More analytics features will be added as the Fantasy season progresses. Check back soon!
          </div>
        </div>
      </div>
    </div>
  );
}
