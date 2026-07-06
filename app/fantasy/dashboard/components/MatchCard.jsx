"use client";

/**
 * MatchCard - Reusable match card component
 *
 * Props:
 * - homeCode: Home team country code (e.g., "ARG")
 * - awayCode: Away team country code (e.g., "BRA")
 * - homeFlag: Home team flag URL
 * - awayFlag: Away team flag URL
 * - time: Match time (e.g., "05:00 (giờ VN)")
 * - date: Match date (e.g., "12 tháng 6, 2026")
 * - group: Group/stage label (e.g., "Bảng A")
 * - status: "scheduled" | "live" | "completed"
 * - homeScore: Optional home team score
 * - awayScore: Optional away team score
 */
export default function MatchCard({
  homeCode = "",
  awayCode = "",
  homeFlag = "",
  awayFlag = "",
  time = "",
  date = "",
  group = "",
  status = "scheduled",
  homeScore = null,
  awayScore = null,
}) {
  const isCompleted = status === "completed";
  const isLive = status === "live";
  const isScheduled = status === "scheduled";

  return (
    <div
      className={`
        rounded-lg overflow-hidden border transition-all
        ${isLive ? "border-primary bg-surface-container" : "border-surface-variant bg-surface-container-lowest"}
        ${isLive ? "ring-1 ring-primary ring-opacity-50" : ""}
      `}
    >
      {/* Status badge */}
      {isLive && (
        <div className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
          <span className="relative inline-block w-1.5 h-1.5 bg-on-primary rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      <div className="px-4 py-3">
        {/* Header: Group + Time */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-on-surface-variant font-medium">{group}</span>
          <span className="text-xs text-on-surface-variant">{time}</span>
        </div>

        {/* Match display */}
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {homeFlag && (
              <img
                src={homeFlag}
                alt={homeCode}
                className="w-12 h-8 object-cover rounded"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <span className="text-sm font-bold text-on-surface">{homeCode}</span>
          </div>

          {/* Score or Time */}
          <div className="flex flex-col items-center gap-1">
            {isCompleted && homeScore !== null && awayScore !== null ? (
              <>
                <div className="text-lg font-bold text-on-surface">
                  {homeScore}
                  <span className="text-on-surface-variant mx-1">-</span>
                  {awayScore}
                </div>
                <span className="text-xs text-on-surface-variant">FINAL</span>
              </>
            ) : isLive ? (
              <>
                <div className="text-lg font-bold text-primary">
                  {homeScore !== null && awayScore !== null
                    ? `${homeScore}-${awayScore}`
                    : "--"}
                </div>
                <span className="text-xs text-on-surface-variant">LIVE</span>
              </>
            ) : (
              <>
                <span className="text-xs text-on-surface-variant font-medium">
                  {time.split(" ")[0]}
                </span>
              </>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {awayFlag && (
              <img
                src={awayFlag}
                alt={awayCode}
                className="w-12 h-8 object-cover rounded"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <span className="text-sm font-bold text-on-surface">{awayCode}</span>
          </div>
        </div>

        {/* Date footer */}
        <div className="text-xs text-on-surface-variant text-center mt-3 pt-3 border-t border-surface-variant">
          {date}
        </div>
      </div>
    </div>
  );
}
