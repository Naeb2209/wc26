"use client";

import { Fragment, useMemo, useState } from "react";
import { ManagerLineup } from "./SquadView";
import tournamentStats from "@/data/tournament-stats.mock.json";

const MEDAL = {
  1: { bg: "#fff8e1", ring: "#ffd700", label: "🥇" },
  2: { bg: "#f3f4f6", ring: "#c0c0c0", label: "🥈" },
  3: { bg: "#fbeee0", ring: "#cd7f32", label: "🥉" },
};

const TABS = [
  { key: "total", label: "Tổng điểm", icon: "leaderboard" },
  { key: "round", label: "Round", icon: "calendar_month" },
  { key: "info", label: "Thông tin giải đấu", icon: "info" },
  { key: "rules", label: "Luật", icon: "gavel" },
];

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

function SummaryCard({ icon, title, value, subtitle, color = "text-primary" }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
      <div className="flex items-center gap-2 text-on-surface-variant text-sm">
        <span className={`material-symbols-outlined ${color}`}>{icon}</span>
        {title}
      </div>
      <div className="mt-2 font-bold text-xl text-on-surface truncate">{value}</div>
      {subtitle && <div className="text-sm text-on-surface-variant mt-1">{subtitle}</div>}
    </div>
  );
}

function Avatar({ src, name, size = "w-8 h-8" }) {
  return (
    <div className={`${size} rounded-full bg-white border border-outline-variant overflow-hidden flex items-center justify-center shrink-0`}>
      {src ? (
        <img src={src} alt="" className="w-full h-full object-contain p-0.5" />
      ) : (
        <span className="font-data-mono text-[12px] text-on-surface-variant">
          {(name || "?").trim()[0]?.toUpperCase()}
        </span>
      )}
    </div>
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

/* ---------------- Tab: Tổng điểm ---------------- */
function TotalTab({ standings }) {
  const top3 = standings.slice(0, 3);
  const seasonLeader = standings[0];
  const bottom = standings.at(-1);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <SummaryCard icon="military_tech" title="Dẫn đầu" value={seasonLeader?.manager || "-"} subtitle={`${seasonLeader?.totalPoints || 0} pts`} />
        <SummaryCard icon="groups" title="Số người chơi" value={standings.length} subtitle="manager" />
        <SummaryCard icon="sentiment_very_dissatisfied" title="Cuối bảng" value={bottom?.manager || "-"} subtitle={`${bottom?.totalPoints || 0} pts`} color="text-error" />
      </div>

      {top3.length === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-10">
          <div className="sm:order-2"><PodiumCard p={top3[0]} /></div>
          <div className="sm:order-1 sm:mt-6"><PodiumCard p={top3[1]} /></div>
          <div className="sm:order-3 sm:mt-6"><PodiumCard p={top3[2]} /></div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-surface-variant overflow-hidden">
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
                  >
                    <td className="py-3 px-4 text-center font-bold" style={top ? { boxShadow: `inset 4px 0 0 0 ${MEDAL[p.rank].ring}` } : undefined}>{p.rank}</td>
                    <td className="py-3 px-2 text-center"><Movement rank={p.rank} prev={p.prev} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={p.avatar} name={p.manager} />
                        <div className="min-w-0">
                          <div className="font-bold text-on-surface truncate">{p.manager}</div>
                          {p.team && <div className="text-on-surface-variant text-[12px] truncate">{p.team}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-on-surface-variant">{p.roundPoints}</td>
                    <td className="py-3 px-4 text-center font-bold text-primary text-[16px]">{p.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- Tab: Round ---------------- */
// 8 vòng tính điểm của World Cup 2026: 3 lượt vòng bảng + 5 vòng loại trực tiếp.
const ROUND_GROUPS = [
  {
    title: "Vòng bảng",
    icon: "grid_view",
    rounds: [
      { key: "g1", label: "Lượt 1", full: "Vòng bảng · Lượt 1" },
      { key: "g2", label: "Lượt 2", full: "Vòng bảng · Lượt 2" },
      { key: "g3", label: "Lượt 3", full: "Vòng bảng · Lượt 3" },
    ],
  },
  {
    title: "Vòng loại trực tiếp",
    icon: "emoji_events",
    rounds: [
      { key: "r32", label: "1/16", full: "Vòng 1/16" },
      { key: "r16", label: "1/8", full: "Vòng 1/8" },
      { key: "qf", label: "Tứ kết", full: "Tứ kết" },
      { key: "sf", label: "Bán kết", full: "Bán kết" },
      { key: "f", label: "Chung kết", full: "Chung kết" },
    ],
  },
];
const ALL_ROUNDS = ROUND_GROUPS.flatMap((g) => g.rounds);

const roundPointsOf = (p, key) => p.rounds?.[key] ?? 0;

// Cầu thủ được chọn nhiều nhất trong vòng — gộp ownership từ tất cả squads.
// _sel để dành cho dữ liệu thật theo vòng; mock hiện dùng chung một đội nên mọi vòng giống nhau.
function mostPickedOf(squads, _sel, limit = 10) {
  const counts = new Map();
  for (const sq of Object.values(squads || {})) {
    const seen = new Set();
    for (const p of [...(sq.starters || []), ...(sq.bench || [])]) {
      const key = `${p.teamCode}:${p.name}`;
      if (seen.has(key)) continue; // mỗi manager tính 1 lần cho mỗi cầu thủ
      seen.add(key);
      const e = counts.get(key) || { name: p.name, team: p.teamName, flag: p.crest, avatar: p.avatar, count: 0 };
      e.count++;
      counts.set(key, e);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => ({ name: e.name, team: e.team, flag: e.flag, avatar: e.avatar, value: e.count }));
}

// Đội trưởng được chọn nhiều nhất — mỗi squad có 1 cầu thủ isCaptain trong đội hình chính.
function captaincyOf(squads, _sel, limit = 10) {
  const counts = new Map();
  for (const sq of Object.values(squads || {})) {
    const cap = (sq.starters || []).find((p) => p.isCaptain);
    if (!cap) continue;
    const key = `${cap.teamCode}:${cap.name}`;
    const e = counts.get(key) || { name: cap.name, team: cap.teamName, flag: cap.crest, avatar: cap.avatar, count: 0 };
    e.count++;
    counts.set(key, e);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => ({ name: e.name, team: e.team, flag: e.flag, avatar: e.avatar, value: e.count }));
}

// Cầu thủ điểm cao nhất vòng — lấy điểm cao nhất giữa các manager cho mỗi cầu thủ.
function topPointsOf(squads, _sel, limit = 10) {
  const best = new Map();
  for (const sq of Object.values(squads || {})) {
    for (const p of [...(sq.starters || []), ...(sq.bench || [])]) {
      const key = `${p.teamCode}:${p.name}`;
      const prev = best.get(key);
      if (!prev || p.points > prev.value) {
        best.set(key, { name: p.name, team: p.teamName, flag: p.crest, avatar: p.avatar, value: p.points });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

// Booster (chip) được dùng nhiều nhất trong vòng — đếm từ chips[sel] của mỗi người chơi.
function chipUsageOf(standings, sel, limit = 10) {
  const counts = new Map();
  for (const p of standings || []) {
    const chip = p.chips?.[sel];
    if (!chip) continue;
    counts.set(chip, (counts.get(chip) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value, chip: true }));
}

// Panel cột phải: 4 tab Pick / Capt / Chip / Top pts cho vòng đang chọn.
const INSIGHT_TABS = [
  { key: "pick", label: "Pick", icon: "how_to_reg", title: "Được chọn nhiều nhất" },
  { key: "capt", label: "Capt", icon: "star", title: "Đội trưởng nhiều nhất" },
  { key: "chip", label: "Chip", icon: "bolt", title: "Booster dùng nhiều nhất" },
  { key: "pts", label: "Top pts", icon: "military_tech", title: "Điểm cao nhất vòng" },
];

function RoundInsights({ squads, standings, sel }) {
  const [view, setView] = useState("pick");
  const data = useMemo(
    () => ({
      pick: mostPickedOf(squads, sel),
      capt: captaincyOf(squads, sel),
      chip: chipUsageOf(standings, sel),
      pts: topPointsOf(squads, sel),
    }),
    [squads, standings, sel]
  );
  const meta = INSIGHT_TABS.find((t) => t.key === view) ?? INSIGHT_TABS[0];
  const rows = data[view] || [];
  const isPts = view === "pts";

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="flex gap-0.5 p-1 bg-surface-container-low border-b border-surface-variant">
        {INSIGHT_TABS.map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              title={t.title}
              className={[
                "flex-1 inline-flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg font-label-caps text-[11px] uppercase whitespace-nowrap transition-colors",
                active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-primary",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="px-4 py-2 font-label-caps text-label-caps uppercase text-on-surface-variant border-b border-surface-variant">
        {meta.title}
      </div>
      {rows.length ? (
        <ol className="divide-y divide-surface-variant">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              {r.chip ? (
                <BoosterIcon name={r.name} size={40} />
              ) : r.avatar ? (
                <img src={r.avatar} alt="" className="w-14 h-14 object-contain object-bottom shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-[34px] bg-gradient-to-b from-[#5ab9d4] via-[#9b3fc4] to-[#f0456f] bg-clip-text text-transparent"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className={`truncate ${i === 0 ? "font-bold text-on-surface" : "text-on-surface"}`}>{r.name}</div>
                {r.team && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[12px] truncate">
                    {r.flag && (
                      <img src={r.flag} alt="" className="w-6 h-4 object-cover rounded-[1px] shrink-0" />
                    )}
                    <span className="truncate">{r.team}</span>
                  </div>
                )}
              </div>
              <span className={`font-data-mono font-bold text-[16px] shrink-0 ${isPts ? "text-secondary" : "text-primary"}`}>
                {r.value}
                {isPts && <span className="text-[10px] ml-0.5">pts</span>}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Chưa có dữ liệu</p>
      )}
    </div>
  );
}

function RoundTab({ standings, squads }) {
  const hasData = useMemo(() => {
    const m = {};
    for (const r of ALL_ROUNDS) m[r.key] = standings.some((p) => roundPointsOf(p, r.key) !== 0);
    return m;
  }, [standings]);

  // Mặc định mở vòng mới nhất có dữ liệu, nếu chưa có thì mở Lượt 1.
  const defaultKey = [...ALL_ROUNDS].reverse().find((r) => hasData[r.key])?.key ?? ALL_ROUNDS[0].key;
  const [sel, setSel] = useState(defaultKey);

  const meta = ALL_ROUNDS.find((r) => r.key === sel) ?? ALL_ROUNDS[0];
  const empty = !hasData[sel];

  const ranked = useMemo(
    () =>
      [...standings]
        .map((p) => ({ ...p, rpts: roundPointsOf(p, sel) }))
        .sort((a, b) => b.rpts - a.rpts)
        .map((p, i) => ({ ...p, roundRank: i + 1 })),
    [standings, sel]
  );

  const winner = ranked[0];

  // Manager đang xem đội hình (mặc định bám theo người thắng vòng).
  const [picked, setPicked] = useState(null);
  const current = (picked && ranked.find((p) => p.manager === picked)) || winner;

  return (
    <>
      {/* Bộ chọn vòng — một hàng, ngăn vòng bảng / loại trực tiếp bằng vạch mảnh */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {ROUND_GROUPS.map((g, gi) => (
          <Fragment key={g.title}>
            {gi > 0 && (
              <span className="hidden sm:block w-px h-6 bg-outline-variant mx-1" aria-hidden="true" />
            )}
            {g.rounds.map((r) => {
              const active = sel === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setSel(r.key)}
                  title={r.full}
                  className={[
                    "px-3.5 py-1.5 rounded-full font-label-caps text-label-caps uppercase border transition-colors",
                    active
                      ? "bg-primary text-on-primary border-primary"
                      : hasData[r.key]
                      ? "bg-surface-container-low text-on-surface border-outline-variant hover:border-primary hover:text-primary"
                      : "bg-surface-container-low text-outline border-outline-variant hover:border-primary",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      {empty ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-primary">hourglass_empty</span>
          <p className="mt-3 font-bold text-on-surface">Chưa có dữ liệu {meta.full}</p>
          <p className="text-sm text-on-surface-variant">
            Thêm điểm từng vòng vào trường <span className="font-data-mono">rounds</span> của mỗi người chơi trong data/db.json.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,11fr)_minmax(0,4fr)] gap-gutter items-start">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl">
            <div className="overflow-x-auto px-2">
              <table className="w-full text-left border-separate border-spacing-y-2 min-w-[360px]">
                <thead className="text-on-primary font-label-caps text-label-caps">
                  <tr>
                    <th className="py-3 px-4 bg-primary rounded-l-lg">Người chơi</th>
                    <th className="py-3 px-4 text-center font-bold bg-primary">Điểm vòng</th>
                    <th className="py-3 px-2 text-center bg-primary text-on-primary/80 rounded-r-lg">Tổng</th>
                  </tr>
                </thead>
                <tbody className="font-data-mono text-data-mono">
                  {ranked.map((p) => {
                    const isBottom = ranked.length > 3 && p.roundRank === ranked.length;
                    const isSel = current?.manager === p.manager;
                    const ringColor = p.roundRank === 1 ? "#facc15" : isBottom ? "#ba1a1a" : "#e5e7eb";
                    const tint = p.roundRank === 1 ? "#fffbeb" : null; // nền vàng nhạt cho hạng 1
                    const ring = (extra) => ({
                      borderStyle: "solid",
                      borderColor: ringColor,
                      borderTopWidth: 2,
                      borderBottomWidth: 2,
                      ...(tint ? { background: tint } : {}),
                      ...extra,
                    });
                    const cellBg = "bg-white group-hover:bg-surface-container";
                    return (
                      <tr
                        key={p.rank}
                        onClick={() => setPicked(p.manager)}
                        className="group cursor-pointer transition-colors"
                        style={
                          p.roundRank === 1
                            ? { boxShadow: "0 0 14px rgba(250,204,21,0.55)" }
                            : isBottom
                            ? { boxShadow: "0 0 14px rgba(186,26,26,0.5)" }
                            : undefined
                        }
                      >
                        <td className={`relative py-2 px-4 rounded-l-lg ${cellBg}`} style={ring({ borderLeftWidth: 2 })}>
                          {p.roundRank === 1 && (
                            <span title="Hạng nhất" className="absolute -top-2 -left-2 z-10 text-[18px] leading-none drop-shadow -rotate-45">👑</span>
                          )}
                          {isBottom && (
                            <span title="Bét bảng" className="absolute -top-2 -left-2 z-10 text-[18px] leading-none drop-shadow -rotate-45">💣</span>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold truncate ${isSel ? "text-primary" : "text-on-surface"}`}>{p.manager}</span>
                              {p.chips?.[sel] && (
                                <span title={p.chips[sel]} className="shrink-0 cursor-help">
                                  <BoosterIcon name={p.chips[sel]} size={28} />
                                </span>
                              )}
                            </div>
                            {p.team && <div className="text-on-surface-variant text-[12px] truncate">{p.team}</div>}
                          </div>
                        </td>
                        <td className={`py-2 px-4 text-center font-bold text-primary text-[16px] ${cellBg}`} style={ring()}>{p.rpts}</td>
                        <td className={`py-2 px-2 text-center text-on-surface-variant rounded-r-lg ${cellBg}`} style={ring({ borderRightWidth: 2 })}>{p.totalPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ManagerLineup
            manager={current?.manager}
            squad={squads?.[current?.manager]}
            points={current?.rpts}
            chip={current?.chips?.[sel]}
            chipIcon={current?.chips?.[sel] ? <BoosterIcon name={current.chips[sel]} size={22} /> : null}
          />

          {/* Thống kê vòng (Pick / Capt / Chip / Top pts) — cột phải ở xl, full-width bên dưới ở mốc nhỏ hơn */}
          <div className="lg:col-span-2 xl:col-span-1">
            <RoundInsights squads={squads} standings={standings} sel={sel} />
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Tab: Thông tin giải đấu — bảng thống kê ---------------- */
// Một bảng xếp hạng (vua phá lưới / kiến tạo / đội ghi bàn / đội thủng lưới).
// rows: [{ name, team?, flag, avatar?, value }] — team bỏ trống khi xếp theo đội.
// Có avatar -> hiện ảnh cầu thủ (tròn) + cờ nhỏ ở dòng đội; không có -> dùng cờ làm ảnh chính.
function LeaderboardCard({ icon, title, unit, rows, accent = "bg-primary text-on-primary", valueColor = "text-primary" }) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className={`${accent} font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {title}
      </div>
      {rows?.length ? (
        <ol className="divide-y divide-surface-variant">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              {r.avatar ? (
                <img src={r.avatar} alt="" className="w-[72px] h-[72px] object-contain object-bottom shrink-0" />
              ) : (
                r.flag && (
                  <img
                    src={r.flag}
                    alt=""
                    className="w-7 h-5 object-contain border border-outline-variant bg-white shrink-0"
                  />
                )
              )}
              <div className="min-w-0 flex-1">
                <div className={`truncate ${i === 0 ? "font-bold text-on-surface" : "text-on-surface"}`}>{r.name}</div>
                {r.team && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[12px] truncate">
                    {r.avatar && r.flag && (
                      <img src={r.flag} alt="" className="w-4 h-3 object-contain border border-outline-variant bg-white shrink-0" />
                    )}
                    <span className="truncate">{r.team}</span>
                  </div>
                )}
              </div>
              <span className={`font-data-mono font-bold text-[16px] shrink-0 ${valueColor}`}>{r.value}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Chưa có dữ liệu</p>
      )}
      {unit && rows?.length > 0 && (
        <p className="px-4 py-2 border-t border-surface-variant font-label-caps text-label-caps text-on-surface-variant uppercase text-right">
          Đơn vị: {unit}
        </p>
      )}
    </div>
  );
}

function StatsLeaderboards() {
  const s = tournamentStats || {};
  const scorers = (s.topScorers || []).map((p) => ({ name: p.name, team: p.team, flag: p.flag, avatar: p.avatar, value: p.goals }));
  const assists = (s.topAssists || []).map((p) => ({ name: p.name, team: p.team, flag: p.flag, avatar: p.avatar, value: p.assists }));
  const fantasy = (s.topFantasy || []).map((p) => ({ name: p.name, team: p.team, flag: p.flag, avatar: p.avatar, value: p.points }));
  const goalsTeams = (s.mostGoalsTeams || []).map((t) => ({ name: t.team, flag: t.flag, value: t.goals }));
  const concededTeams = (s.mostConcededTeams || []).map((t) => ({ name: t.team, flag: t.flag, value: t.conceded }));
  const cleanSheetTeams = (s.mostCleanSheetTeams || []).map((t) => ({ name: t.team, flag: t.flag, value: t.cleanSheets }));
  const cards = (s.mostCards || []).map((p) => ({
    name: p.name,
    team: p.team,
    flag: p.flag,
    avatar: p.avatar,
    value: `🟨${p.yellow}${p.red ? ` 🟥${p.red}` : ""}`,
  }));

  return (
    <div className="space-y-10">
      <section>
        <h3 className="font-display-lg text-headline-md text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined">person</span>
          Thành tích cá nhân
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
          <LeaderboardCard icon="sports_soccer" title="Vua phá lưới" unit="bàn thắng" rows={scorers} />
          <LeaderboardCard icon="handshake" title="Vua kiến tạo" unit="kiến tạo" rows={assists} />
          <LeaderboardCard icon="stars" title="Điểm Fantasy cao nhất" unit="điểm" rows={fantasy} accent="bg-secondary text-on-secondary" valueColor="text-secondary" />
          <LeaderboardCard icon="style" title="Nhiều thẻ phạt nhất" unit="🟨 vàng · 🟥 đỏ" rows={cards} accent="bg-error text-on-error" valueColor="text-on-surface" />
        </div>
      </section>

      <section>
        <h3 className="font-display-lg text-headline-md text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined">groups</span>
          Thành tích đội tuyển
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          <LeaderboardCard icon="trending_up" title="Đội ghi nhiều bàn nhất" unit="bàn thắng" rows={goalsTeams} accent="bg-tertiary text-on-tertiary" valueColor="text-tertiary" />
          <LeaderboardCard icon="shield" title="Đội giữ sạch lưới nhiều nhất" unit="trận sạch lưới" rows={cleanSheetTeams} accent="bg-tertiary text-on-tertiary" valueColor="text-tertiary" />
          <LeaderboardCard icon="gpp_bad" title="Đội thủng lưới nhiều nhất" unit="bàn thua" rows={concededTeams} accent="bg-error text-on-error" valueColor="text-error" />
        </div>
      </section>
    </div>
  );
}

/* ---------------- Tab: Thông tin giải đấu ---------------- */
function InfoTab() {
  return <StatsLeaderboards />;
}

/* ---------------- Tab: Luật ---------------- */
// Luật tính điểm chính thức theo FIFA World Cup 2026 Fantasy, chia theo nhóm vị trí.
// pts: "+0" hiển thị trung tính, "+" xanh, "-" đỏ.

// Áp dụng cho mọi vị trí.
const SCORING_ALL = [
  { icon: "schedule", label: "Ra sân (tối đa 60 phút)", pts: "+1" },
  { icon: "timer", label: "Ra sân (60+ phút)", pts: "+1" },
  { icon: "handshake", label: "Kiến tạo", pts: "+3" },
  { icon: "sports_soccer", label: "Kiếm được penalty", pts: "+2" },
  { icon: "warning", label: "Để đối thủ hưởng penalty", pts: "-1" },
  { icon: "style", label: "Thẻ vàng", pts: "-1" },
  { icon: "style", label: "Thẻ đỏ", pts: "-2" },
  { icon: "swap_horiz", label: "Phản lưới nhà", pts: "-2" },
];

// Điểm thưởng (bonus) — áp dụng cho mọi vị trí.
const SCORING_BONUS = [
  { icon: "sports_soccer", label: "Ghi bàn từ đá phạt trực tiếp", sub: "Cộng thêm ngoài điểm ghi bàn", pts: "+1" },
  { icon: "search", label: "Scouting bonus", sub: "Ghi >4 điểm/trận & có mặt ở <5% số đội", pts: "+2" },
];

// Luật riêng theo từng vị trí.
const SCORING_BY_POSITION = [
  {
    title: "Thủ môn",
    icon: "sports_handball",
    items: [
      { icon: "shield", label: "Giữ sạch lưới (60+ phút)", pts: "+5" },
      { icon: "sports_soccer", label: "Ghi bàn", pts: "+9" },
      { icon: "block", label: "Cản penalty", sub: "Không tính loạt sút luân lưu", pts: "+3" },
      { icon: "sports_handball", label: "Mỗi 3 lần cứu thua", pts: "+1" },
      { icon: "south", label: "Bàn thua đầu tiên", pts: "+0" },
      { icon: "warning", label: "Mỗi bàn thua tiếp theo", pts: "-1" },
    ],
  },
  {
    title: "Hậu vệ",
    icon: "shield_person",
    items: [
      { icon: "shield", label: "Giữ sạch lưới (60+ phút)", pts: "+5" },
      { icon: "sports_soccer", label: "Ghi bàn", pts: "+7" },
      { icon: "south", label: "Bàn thua đầu tiên", pts: "+0" },
      { icon: "warning", label: "Mỗi bàn thua tiếp theo", pts: "-1" },
    ],
  },
  {
    title: "Tiền vệ",
    icon: "directions_run",
    items: [
      { icon: "sports_soccer", label: "Ghi bàn", pts: "+6" },
      { icon: "shield", label: "Giữ sạch lưới (60+ phút)", pts: "+1" },
      { icon: "sports_kabaddi", label: "Mỗi 3 pha tắc bóng", pts: "+1" },
      { icon: "bolt", label: "Mỗi 2 cơ hội tạo ra", pts: "+1" },
    ],
  },
  {
    title: "Tiền đạo",
    icon: "sports_soccer",
    items: [
      { icon: "sports_soccer", label: "Ghi bàn", pts: "+5" },
      { icon: "my_location", label: "Mỗi 2 cú sút trúng đích", pts: "+1" },
    ],
  },
];

// 5 booster của FIFA World Cup 2026 Fantasy.
const BOOSTERS = [
  {
    name: "Wildcard",
    icon: "auto_fix_high",
    desc: "Chuyển nhượng không giới hạn trong một vòng. Không dùng được ở trận đầu vòng bảng và vòng 1/16. Đã xác nhận thì không hoàn tác được.",
  },
  {
    name: "12th Man",
    icon: "group_add",
    desc: "Chọn thêm 1 cầu thủ ghi điểm cho đội trong vòng. Cầu thủ này không bị thay, không làm đội trưởng, không chuyển nhượng; bất kỳ ai chưa có trong đội, không tính ngân sách/giới hạn.",
  },
  {
    name: "Maximum Captain",
    icon: "star",
    desc: "Nhân đôi điểm của cầu thủ ghi nhiều điểm nhất trong đội hình chính. Cầu thủ này tự động được trao băng đội trưởng.",
  },
  {
    name: "Qualification Booster",
    icon: "trending_up",
    desc: "Kích hoạt từ vòng 1/16 trở đi. +2 điểm cho mỗi cầu thủ đá chính đi tiếp vòng sau (hoặc vô địch chung kết), cần ra sân tối thiểu 1 phút. Nếu là đội trưởng thì +2 này không được nhân đôi.",
  },
  {
    name: "Mystery Booster",
    icon: "help",
    desc: "Hé lộ khi Lượt 3 khoá và vòng 1/16 mở. Dùng cho một vòng knock-out bất kỳ, kể cả chung kết. Sẽ có thông báo khi khả dụng.",
  },
];

// Icon tự vẽ cho 5 booster — tile cam, glyph trắng, lấy gợi ý từ bộ icon chính thức.
const BOOSTER_ORANGE = "#e8730c";
function BoosterIcon({ name, size = 40 }) {
  const sv = { width: size, height: size, display: "block" };
  let glyph = null;
  switch (name) {
    case "Maximum Captain":
      glyph = (
        <svg viewBox="0 0 48 48" style={sv} aria-hidden="true">
          <rect x="8" y="14" width="32" height="20" rx="6" fill="#fff" />
          <text x="24" y="27" textAnchor="middle" fontSize="13" fontWeight="800" fill={BOOSTER_ORANGE}>C</text>
          <text x="24" y="33" textAnchor="middle" fontSize="6" fontWeight="700" letterSpacing="0.6" fill={BOOSTER_ORANGE}>MAX</text>
        </svg>
      );
      break;
    case "12th Man":
    case "Wildcard": {
      const label = name === "Wildcard" ? "∞" : "12";
      glyph = (
        <svg viewBox="0 0 48 48" style={sv} aria-hidden="true">
          <path
            d="M24 8c-2.6 0-4.2.9-5.2 1.7L11.5 12 8 19.2l5 4.3 2-1.9V41h18V21.6l2 1.9 5-4.3-3.5-7.2-7.3-2.3C28.2 8.9 26.6 8 24 8z"
            fill="#fff"
          />
          <text x="24" y="35" textAnchor="middle" fontSize={name === "Wildcard" ? "17" : "13"} fontWeight="800" fill={BOOSTER_ORANGE}>
            {label}
          </text>
        </svg>
      );
      break;
    }
    case "Qualification Booster":
      glyph = (
        <svg viewBox="0 0 48 48" style={sv} aria-hidden="true">
          <path d="M17 9l5 13h4L21 9z" fill="#fff" />
          <path d="M31 9l-5 13h-4l5-13z" fill="#fff" />
          <circle cx="24" cy="31" r="9" fill="#fff" />
          <text x="24" y="35" textAnchor="middle" fontSize="11" fontWeight="800" fill={BOOSTER_ORANGE}>{"★"}</text>
        </svg>
      );
      break;
    case "Mystery Booster":
    default:
      glyph = (
        <svg viewBox="0 0 48 48" style={sv} aria-hidden="true">
          <text x="24" y="34" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">?</text>
        </svg>
      );
  }
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.2, background: BOOSTER_ORANGE }}
    >
      {glyph}
    </div>
  );
}

function ptsColor(pts) {
  if (pts.startsWith("-")) return "text-error";
  if (pts === "+0") return "text-on-surface-variant";
  return "text-tertiary";
}

function RuleRow({ it }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">{it.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-on-surface text-sm">{it.label}</span>
        {it.sub && <span className="block text-on-surface-variant text-[12px] leading-snug">{it.sub}</span>}
      </span>
      <span className={`font-data-mono font-bold shrink-0 ${ptsColor(it.pts)}`}>{it.pts}</span>
    </li>
  );
}

function RuleCard({ title, icon, items, accent }) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className={`${accent} font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {title}
      </div>
      <ul className="divide-y divide-surface-variant">
        {items.map((it) => (
          <RuleRow key={it.label} it={it} />
        ))}
      </ul>
    </div>
  );
}

function RulesTab() {
  return (
    <div className="space-y-8">
      {/* Áp dụng cho mọi vị trí: luật chung + điểm thưởng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter max-w-3xl">
        <RuleCard title="Tất cả cầu thủ" icon="groups" items={SCORING_ALL} accent="bg-primary text-on-primary" />
        <RuleCard title="Điểm thưởng" icon="emoji_events" items={SCORING_BONUS} accent="bg-secondary text-on-secondary" />
      </div>

      {/* Luật riêng theo vị trí */}
      <div>
        <h3 className="font-display-lg text-headline-md text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined">person_pin</span>
          Điểm theo vị trí
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {SCORING_BY_POSITION.map((g) => (
            <RuleCard key={g.title} title={g.title} icon={g.icon} items={g.items} accent="bg-tertiary text-on-tertiary" />
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          Boosters — 5 lượt tăng tốc
        </div>
        <ul className="divide-y divide-surface-variant">
          {BOOSTERS.map((b) => (
            <li key={b.name} className="flex gap-3 px-4 py-3">
              <BoosterIcon name={b.name} size={40} />
              <div className="min-w-0">
                <div className="font-bold text-on-surface">{b.name}</div>
                <div className="text-sm text-on-surface-variant leading-relaxed">{b.desc}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="px-4 py-3 border-t border-surface-variant font-label-caps text-label-caps text-on-surface-variant uppercase flex items-start gap-1">
          <span className="material-symbols-outlined text-[16px]">info</span>
          Mỗi booster chỉ dùng một lần, không dùng nhiều booster cùng lúc. Trừ Wildcard, các booster có thể huỷ trước khi vòng khoá.
        </p>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
        <h3 className="font-display-lg text-headline-md text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined">menu_book</span>
          Luật chung
        </h3>
        <ul className="space-y-3 font-body-lg text-body-lg text-on-surface leading-relaxed">
          <li className="flex gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">groups</span>
            Đội hình gồm 15 cầu thủ (2 TM, 5 HV, 5 TV, 3 TĐ) với ngân sách 100.0M.
          </li>
          <li className="flex gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">star</span>
            Đội trưởng (Captain) được nhân đôi điểm. Vice-captain thay thế nếu Captain không ra sân.
          </li>
          <li className="flex gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">swap_horiz</span>
            Mỗi vòng được chuyển nhượng miễn phí; chuyển nhượng thừa bị trừ điểm.
          </li>
          <li className="flex gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">bolt</span>
            5 booster (Wildcard, 12th Man, Maximum Captain, Qualification Booster, Mystery Booster) — mỗi loại dùng một lần. Chi tiết ở mục Boosters bên trên.
          </li>
          <li className="flex gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">lock_clock</span>
            Hạn chốt đội hình trước trận đầu tiên của mỗi vòng đấu.
          </li>
        </ul>
        <p className="mt-5 font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">info</span>
          Luật tham khảo theo thể thức FIFA World Cup Fantasy — chi tiết xem trên trang chính thức.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Shell ---------------- */
export default function FantasyTabs({ standings, squads }) {
  const [tab, setTab] = useState("total");

  if (standings.length === 0) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
        <span className="material-symbols-outlined text-[40px] text-primary">leaderboard</span>
        <p className="mt-3 font-bold text-on-surface">Fantasy League Empty</p>
        <p className="text-sm text-on-surface-variant">Sync FIFA Fantasy to get started.</p>
      </div>
    );
  }

  return (
    <>
      {/* Tab bar — segmented control (pill trong khung) để khác hẳn nav underline ở trên */}
      <div className="mb-8 -mx-margin-mobile md:-mx-margin-desktop px-margin-mobile md:px-margin-desktop overflow-x-auto">
        <div className="inline-flex gap-1 p-1 rounded-full bg-surface-container-low border border-outline-variant min-w-max">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps uppercase whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "total" && <TotalTab standings={standings} />}
      {tab === "round" && <RoundTab standings={standings} squads={squads} />}
      {tab === "info" && <InfoTab />}
      {tab === "rules" && <RulesTab />}
    </>
  );
}
