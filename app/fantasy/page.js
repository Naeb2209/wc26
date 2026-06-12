import { getFantasy } from "@/lib/fifa-api";

export const revalidate = 60;

const MEDAL = {
  1: { bg: "#fff8e1", ring: "#ffd700", label: "🥇" },
  2: { bg: "#f3f4f6", ring: "#c0c0c0", label: "🥈" },
  3: { bg: "#fbeee0", ring: "#cd7f32", label: "🥉" },
};

function Movement({ rank, prev }) {
  if (prev == null || prev === rank) {
    return <span className="text-outline font-data-mono text-[12px]">—</span>;
  }
  const up = prev > rank;
  return (
    <span className={`inline-flex items-center font-data-mono text-[12px] ${up ? "text-tertiary" : "text-error"}`}>
      <span className="material-symbols-outlined text-[16px]">{up ? "arrow_drop_up" : "arrow_drop_down"}</span>
      {Math.abs(prev - rank)}
    </span>
  );
}

function PodiumCard({ p }) {
  const m = MEDAL[p.rank];
  return (
    <div
      className="rounded-xl border p-5 flex flex-col items-center text-center gap-2 shadow-sm"
      style={{ background: m.bg, borderColor: m.ring }}
    >
      <div className="text-3xl">{m.label}</div>
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center font-display-lg text-headline-md text-on-surface border-2 overflow-hidden"
        style={{ borderColor: m.ring, background: "#fff" }}
      >
        {p.avatar ? (
          <img src={p.avatar} alt="" className="w-full h-full object-contain p-1" />
        ) : (
          (p.manager || "?").trim()[0]?.toUpperCase()
        )}
      </div>
      <div>
        <div className="font-bold text-on-surface">{p.manager}</div>
        {p.team && <div className="font-data-mono text-data-mono text-on-surface-variant">{p.team}</div>}
      </div>
      <div className="font-display-lg text-display-lg-mobile text-primary leading-none mt-1">{p.totalPoints}</div>
      <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">Tổng điểm</div>
      <div className="font-data-mono text-[12px] text-on-surface-variant">Vòng này: {p.roundPoints}</div>
    </div>
  );
}

export default async function FantasyPage() {
  const data = await getFantasy();
  const standings = data.standings || [];
  const top3 = standings.slice(0, 3);

  const roundLeader =
    [...standings].sort(
      (a, b) => (b.roundPoints ?? 0) - (a.roundPoints ?? 0)
    )[0];

  const seasonLeader =
    [...standings].sort(
      (a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)
    )[0];

  const roundBottom =
    [...standings].sort(
      (a, b) => (a.roundPoints ?? 0) - (b.roundPoints ?? 0)
    )[0];

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <header className="mb-8 border-b-2 border-surface-variant pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary flex items-center gap-3">
            <span className="material-symbols-outlined text-[40px]">emoji_events</span>
            {data.leagueName || "FIFA Fantasy"}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Bảng xếp hạng người chơi FIFA World Cup Fantasy 2026 — {data.updatedRound}
          </p>
        </div>
        {data.leagueUrl && (
          <a
            href={data.leagueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-primary text-on-primary font-label-caps text-label-caps uppercase px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Mở league FIFA
          </a>
        )}
      </header>

      {standings.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-primary">
            leaderboard
          </span>

          <p className="mt-3 font-bold text-on-surface">
            Fantasy League Empty
          </p>

          <p className="text-sm text-on-surface-variant">
            Sync FIFA Fantasy to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-10">
              <div className="sm:order-2">
                <PodiumCard p={top3[0]} />
              </div>
              <div className="sm:order-1 sm:mt-6">
                <PodiumCard p={top3[1]} />
              </div>
              <div className="sm:order-3 sm:mt-6">
                <PodiumCard p={top3[2]} />
              </div>
            </div>
          )}

          {/* Full table */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead className="bg-primary text-on-primary font-label-caps text-label-caps">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Hạng</th>
                    <th className="py-3 px-2 w-12 text-center" title="Biến động so với vòng trước">+/-</th>
                    <th className="py-3 px-4">Người chơi</th>
                    <th className="py-3 px-2 text-center" title="Điểm vòng này">Vòng</th>
                    <th className="py-3 px-4 text-center font-bold">Tổng</th>
                  </tr>
                </thead>
                <tbody className="font-data-mono text-data-mono">
                  {standings.map((p) => {
                    const top = p.rank <= 3;
                    return (
                      <tr
                        key={p.rank}
                        className="table-zebra border-b border-surface-variant hover:bg-surface-container transition-colors"
                        style={top ? { borderLeft: `4px solid ${MEDAL[p.rank].ring}` } : undefined}
                      >
                        <td className="py-3 px-4 text-center font-bold">{p.rank}</td>
                        <td className="py-3 px-2 text-center">
                          <Movement rank={p.rank} prev={p.prev} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white border border-outline-variant overflow-hidden flex items-center justify-center shrink-0">
                              {p.avatar ? (
                                <img src={p.avatar} alt="" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span className="font-data-mono text-[12px] text-on-surface-variant">
                                  {(p.manager || "?").trim()[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-on-surface truncate">{p.manager}</div>
                              {p.team && <div className="text-on-surface-variant text-[12px] truncate">{p.team}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-on-surface-variant">{p.roundPoints}</td>
                        <td className="py-3 px-4 text-center font-bold text-primary text-[16px]">{p.totalPoints ?? p.total ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mt-4 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">info</span>
            Dữ liệu cập nhật thủ công sau mỗi vòng trong data/db.json
          </p>
        </>
      )}
    </main>
  );
}
