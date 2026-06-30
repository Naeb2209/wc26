"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ManagerLineup } from "./SquadView";

const MEDAL = {
  1: { bg: "#fff8e1", ring: "#ffd700", label: "🥇" },
  2: { bg: "#f3f4f6", ring: "#c0c0c0", label: "🥈" },
  3: { bg: "#fbeee0", ring: "#cd7f32", label: "🥉" },
};

const TABS = [
  { key: "total", label: "Tổng điểm", short: "Tổng", icon: "leaderboard" },
  { key: "round", label: "Round", short: "Round", icon: "calendar_month" },
  { key: "info", label: "Thông tin giải đấu", short: "Giải đấu", icon: "info" },
  { key: "rules", label: "Luật", short: "Luật", icon: "gavel" },
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

function PodiumCard({ p, place }) {
  const m = MEDAL[place] || MEDAL[3];
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

  // Vòng đang xét = vòng mới nhất đã có điểm hoặc đã có người dùng booster.
  const currentKey = useMemo(
    () =>
      [...ALL_ROUNDS]
        .reverse()
        .find((r) => standings.some((p) => roundPointsOf(p, r.key) !== 0 || p.chips?.[r.key]))?.key ?? null,
    [standings]
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <SummaryCard icon="military_tech" title="Dẫn đầu" value={seasonLeader?.manager || "-"} subtitle={`${seasonLeader?.totalPoints || 0} pts`} />
        <SummaryCard icon="groups" title="Số người chơi" value={standings.length} subtitle="manager" />
        <SummaryCard icon="sentiment_very_dissatisfied" title="Cuối bảng" value={bottom?.manager || "-"} subtitle={`${bottom?.totalPoints || 0} pts`} color="text-error" />
      </div>

      {top3.length === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-10">
          <div className="sm:order-2"><PodiumCard p={top3[0]} place={1} /></div>
          <div className="sm:order-1 sm:mt-6"><PodiumCard p={top3[1]} place={2} /></div>
          <div className="sm:order-3 sm:mt-6"><PodiumCard p={top3[2]} place={3} /></div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 font-data-mono text-[11px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px]" style={{ background: BOOSTER_ORANGE }} />
          Booster đã dùng (kèm vòng)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] ring-2 ring-tertiary" style={{ background: BOOSTER_ORANGE }} />
          <span className="text-tertiary font-bold">Đang dùng vòng này</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] opacity-25" style={{ background: BOOSTER_ORANGE, filter: "grayscale(1)" }} />
          Chưa dùng
        </span>
      </div>

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
                    <td
                      className="py-3 px-4 text-center font-bold"
                      style={top && MEDAL[p.rank] ? { boxShadow: `inset 4px 0 0 0 ${MEDAL[p.rank].ring}` } : undefined}
                    >
                      {p.rank}
                    </td>
                    <td className="py-3 px-2 text-center"><Movement rank={p.rank} prev={p.prev} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={p.avatar} name={p.manager} />
                        <div className="min-w-0">
                          <div className="font-bold text-on-surface truncate">{p.manager}</div>
                          {p.team && <div className="text-on-surface-variant text-[12px] truncate">{p.team}</div>}
                          <ManagerChips chips={p.chips} currentKey={currentKey} />
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

// Tên đội trưởng trong đội hình chính của 1 squad (ưu tiên Max Captain nếu có).
function captainNameOf(squad) {
  const starters = squad?.starters || [];
  const cap = starters.find((p) => p.isMaxCaptain) || starters.find((p) => p.isCaptain);
  return cap?.name || null;
}

// Cầu thủ được chọn nhiều nhất trong vòng — gộp ownership từ tất cả squads.
// _sel để dành cho dữ liệu thật theo vòng; mock hiện dùng chung một đội nên mọi vòng giống nhau.
function mostPickedOf(squads, _sel, limit = 10) {
  const counts = new Map();
  for (const [manager, sq] of Object.entries(squads || {})) {
    const seen = new Set();
    for (const p of [...(sq.starters || []), ...(sq.bench || [])]) {
      const key = `${p.teamCode}:${p.name}`;
      if (seen.has(key)) continue; // mỗi manager tính 1 lần cho mỗi cầu thủ
      seen.add(key);
      const e = counts.get(key) || { name: p.name, team: p.teamName, flag: p.crest, avatar: p.avatar, managers: [] };
      e.managers.push(manager);
      counts.set(key, e);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.managers.length - a.managers.length)
    .slice(0, limit)
    .map((e) => ({ name: e.name, team: e.team, flag: e.flag, avatar: e.avatar, value: e.managers.length, managers: e.managers }));
}

// Đội trưởng được chọn nhiều nhất — mỗi squad có 1 cầu thủ isCaptain trong đội hình chính.
function captaincyOf(squads, _sel, limit = 10) {
  const counts = new Map();
  for (const [manager, sq] of Object.entries(squads || {})) {
    const cap = (sq.starters || []).find((p) => p.isCaptain);
    if (!cap) continue;
    const key = `${cap.teamCode}:${cap.name}`;
    const e = counts.get(key) || { name: cap.name, team: cap.teamName, flag: cap.crest, avatar: cap.avatar, managers: [] };
    e.managers.push(manager);
    counts.set(key, e);
  }
  return [...counts.values()]
    .sort((a, b) => b.managers.length - a.managers.length)
    .slice(0, limit)
    .map((e) => ({ name: e.name, team: e.team, flag: e.flag, avatar: e.avatar, value: e.managers.length, managers: e.managers }));
}

// Cầu thủ điểm cao nhất vòng — lấy điểm cao nhất giữa các manager cho mỗi cầu thủ.
// Dùng điểm GỐC của cầu thủ (rawPoints), không tính phần x2 khi làm đội trưởng.
function topPointsOf(squads, _sel, limit = 10) {
  const best = new Map();
  for (const [manager, sq] of Object.entries(squads || {})) {
    const seen = new Set();
    for (const p of [...(sq.starters || []), ...(sq.bench || [])]) {
      const key = `${p.teamCode}:${p.name}`;
      const pts = p.rawPoints ?? p.points;
      let e = best.get(key);
      if (!e) {
        e = { name: p.name, team: p.teamName, flag: p.crest, avatar: p.avatar, value: pts, managers: [] };
        best.set(key, e);
      }
      if (pts > e.value) e.value = pts;
      if (!seen.has(manager)) { seen.add(manager); e.managers.push(manager); } // HLV đang chọn cầu thủ này
    }
  }
  return [...best.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((e) => ({ name: e.name, team: e.team, flag: e.flag, avatar: e.avatar, value: e.value, managers: e.managers }));
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
// (Kết quả các trận tách riêng thành card dưới đội hình — xem MatchResults trong RoundTab.)
const INSIGHT_TABS = [
  { key: "pick", label: "Pick", icon: "how_to_reg", title: "Được chọn nhiều nhất" },
  { key: "capt", label: "Capt", icon: "star", title: "Đội trưởng nhiều nhất" },
  { key: "chip", label: "Chip", icon: "bolt", title: "Booster dùng nhiều nhất" },
  { key: "pts", label: "Top pts", icon: "military_tech", title: "Điểm cao nhất vòng" },
];

const INSIGHT_COLLAPSED = 10; // số dòng hiển thị trước khi bấm "Xem tất cả"

function RoundInsights({ squads, standings, sel }) {
  const [view, setView] = useState("pick");
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // cầu thủ "Pick" đang mở modal danh sách HLV
  const [country, setCountry] = useState("all"); // lọc theo nước (chỉ tab "Pick")
  const data = useMemo(
    () => ({
      pick: mostPickedOf(squads, sel, Infinity),
      capt: captaincyOf(squads, sel, Infinity),
      chip: chipUsageOf(standings, sel, Infinity),
      pts: topPointsOf(squads, sel, Infinity),
    }),
    [squads, standings, sel]
  );
  // Map tên HLV -> avatar/đội để hiển thị trong danh sách "ai đã chọn".
  const mgrInfo = useMemo(() => {
    const m = new Map();
    for (const p of standings || []) m.set(p.manager, { avatar: p.avatar, team: p.team });
    return m;
  }, [standings]);
  // Đổi vòng -> reset trạng thái xổ.
  useEffect(() => {
    setOpen(false);
    setModal(null);
    setCountry("all");
  }, [sel]);
  const selectView = (key) => {
    setView(key);
    setOpen(false); // đổi tab thì gấp lại danh sách
    setModal(null);
    setCountry("all"); // đổi tab thì bỏ lọc nước
  };
  // Danh sách nước có mặt trong tab "Pick" (kèm cờ + số cầu thủ được chọn), xếp theo bảng chữ cái.
  const countries = useMemo(() => {
    const m = new Map();
    for (const r of data.pick || []) {
      if (!r.team) continue;
      const e = m.get(r.team) || { flag: r.flag, count: 0 };
      e.count += 1;
      m.set(r.team, e);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([team, { flag, count }]) => ({ team, flag, count }));
  }, [data.pick]);
  const meta = INSIGHT_TABS.find((t) => t.key === view) ?? INSIGHT_TABS[0];
  const allRows =
    view === "pick" && country !== "all"
      ? (data.pick || []).filter((r) => r.team === country)
      : data[view] || [];
  const rows = open ? allRows : allRows.slice(0, INSIGHT_COLLAPSED);
  const extra = allRows.length - INSIGHT_COLLAPSED;
  const isPts = view === "pts";

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="flex gap-0.5 p-1 bg-surface-container-low border-b border-surface-variant">
        {INSIGHT_TABS.map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => selectView(t.key)}
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
      {view === "pick" && countries.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">flag</span>
          {country !== "all" && (
            <img
              src={countries.find((c) => c.team === country)?.flag}
              alt=""
              className="w-6 h-4 object-cover rounded-[1px] shrink-0"
            />
          )}
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setOpen(false);
            }}
            className="flex-1 min-w-0 bg-surface-container-low border border-surface-variant rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="all">Tất cả các nước ({countries.length})</option>
            {countries.map((c) => (
              <option key={c.team} value={c.team}>
                {c.team} ({c.count})
              </option>
            ))}
          </select>
        </div>
      )}
      {rows.length ? (
        <ol className="divide-y divide-surface-variant">
          {rows.map((r, i) => {
            const managers = Array.isArray(r.managers) ? r.managers : null; // chỉ tab "Pick" có danh sách HLV
            const clickable = managers && managers.length > 0;
            return (
              <li
                key={`${r.name}-${i}`}
                onClick={clickable ? () => setModal(r) : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 ${clickable ? "cursor-pointer hover:bg-surface-container-low transition-colors" : ""}`}
              >
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
                {clickable && (
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">chevron_right</span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Chưa có dữ liệu</p>
      )}
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full font-label-caps text-label-caps uppercase text-primary hover:bg-surface-container-low transition-colors py-2.5 border-t border-surface-variant"
        >
          {open ? "Thu gọn" : `Xem tất cả (${allRows.length})`}
        </button>
      )}
      {modal && (
        <PickedByModal
          row={modal}
          mgrInfo={mgrInfo}
          countLabel={view === "capt" ? "lượt chọn làm đội trưởng" : view === "pts" ? "điểm" : "lượt chọn"}
          listLabel={view === "capt" ? "HLV chọn làm đội trưởng" : "HLV đã chọn"}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// Khóa scroll trang nền khi modal mở + bù bề rộng thanh cuộn để layout không giật.
function useLockBodyScroll() {
  useEffect(() => {
    const scrollBarW = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollBarW > 0) document.body.style.paddingRight = `${scrollBarW}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, []);
}

// "02:00 (giờ VN)" -> "02:00"; "12 tháng 6, 2026" -> "12 tháng 6".
const shortTime = (t) => (t || "").replace(/\s*\(.*\)\s*$/, "").trim() || "—";
const shortDate = (d) => (d || "").replace(/,\s*\d{4}\s*$/, "").trim();

// Danh sách kết quả các trận của vòng (nhóm theo bảng). Đã đá -> tỷ số; chưa đá -> giờ + ngày.
function MatchResults({ matches }) {
  const [openId, setOpenId] = useState(null); // trận đang mở rộng (hiện chi tiết inline)
  const list = matches || [];
  if (!list.length) {
    return <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Chưa có lịch trận</p>;
  }
  // Gom theo bảng để dễ đọc (vòng bảng).
  const groups = [];
  const byGroup = new Map();
  for (const m of list) {
    const g = m.group || "";
    if (!byGroup.has(g)) {
      byGroup.set(g, []);
      groups.push(g);
    }
    byGroup.get(g).push(m);
  }
  const Side = ({ code, flag, alignRight }) => (
    <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${alignRight ? "flex-row-reverse text-right" : ""}`}>
      {flag && <img src={flag} alt="" className="w-6 h-4 object-cover rounded-[1px] shrink-0" />}
      <span className="font-data-mono text-[13px] text-on-surface truncate">{code}</span>
    </div>
  );
  return (
    <div>
      {groups.map((g) => (
        <div key={g || "_"}>
          {g && (
            <div className="px-4 py-1.5 bg-surface-container-low font-label-caps text-[11px] uppercase text-on-surface-variant border-b border-surface-variant">
              {g}
            </div>
          )}
          <ul className="divide-y divide-surface-variant">
            {byGroup.get(g).map((m) => {
              const st = matchStatus(m);
              const score = m.started && m.scoreStr ? m.scoreStr : null;
              const clickable = m.started; // đã đá -> mở rộng xem chi tiết
              const open = openId === m.id;
              return (
                <Fragment key={m.id}>
                  <li
                    onClick={clickable ? () => setOpenId(open ? null : m.id) : undefined}
                    className={`flex items-center gap-2 px-4 py-2.5 ${
                      clickable ? "cursor-pointer hover:bg-surface-container-low transition-colors" : ""
                    } ${open ? "bg-surface-container-low" : ""}`}
                  >
                    {/* spacer cân với mũi tên bên phải để giữ tỷ số ở giữa */}
                    <span className="w-[18px] shrink-0" aria-hidden="true" />
                    <Side code={m.homeCode} flag={m.homeFlag} />
                    <div className="shrink-0 text-center min-w-[64px] leading-tight">
                      {score ? (
                        <span className="font-data-mono font-bold text-[15px] text-on-surface">{score}</span>
                      ) : (
                        <span className="font-data-mono text-[12px] text-on-surface">{shortTime(m.time)}</span>
                      )}
                      {st ? (
                        <span
                          className={`block font-label-caps text-[10px] uppercase mt-0.5 ${
                            st.live ? "text-error font-bold" : "text-on-surface-variant"
                          }`}
                        >
                          {st.live && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-error mr-1 align-middle animate-pulse" />
                          )}
                          {st.text}
                        </span>
                      ) : (
                        m.date && <span className="block text-[10px] text-on-surface-variant mt-0.5">{shortDate(m.date)}</span>
                      )}
                    </div>
                    <Side code={m.awayCode} flag={m.awayFlag} alignRight />
                    {clickable ? (
                      <span
                        className={`material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    ) : (
                      <span className="w-[18px] shrink-0" aria-hidden="true" />
                    )}
                  </li>
                  {open && (
                    <li>
                      <MatchDetail m={m} />
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Chi tiết 1 trận hiển thị INLINE khi mở rộng hàng: người ghi bàn của 2 đội.
function MatchDetail({ m }) {
  const goals = m.goals || [];
  // Bàn phản lưới tính cho đội ĐƯỢC HƯỞNG (đối thủ của người sút).
  const benefitCode = (g) => (g.ownGoal ? (g.teamCode === m.homeCode ? m.awayCode : m.homeCode) : g.teamCode);
  const GoalRow = ({ g, right }) => (
    <div className={`flex items-start gap-1.5 py-1 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
        sports_soccer
      </span>
      <span className="text-[13px] text-on-surface leading-snug">
        <span className="font-data-mono text-on-surface-variant mr-1">{g.min}'</span>
        {g.player}
        {g.penalty && <span className="text-on-surface-variant"> (pen)</span>}
        {g.ownGoal && <span className="text-error"> (OG)</span>}
        {g.assist && (
          <span className="block text-on-surface-variant text-[11px]">
            <span
              className="material-symbols-outlined text-[14px] align-middle mr-0.5"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shoe_cleats
            </span>
            {g.assist}
          </span>
        )}
      </span>
    </div>
  );
  if (!goals.length) {
    return <div className="px-4 py-4 bg-surface-container-low text-sm text-on-surface-variant text-center">Chưa có bàn thắng</div>;
  }
  return (
    <div className="bg-surface-container-low px-4 py-3">
      <div className="grid grid-cols-2 gap-x-3">
        <div>{goals.filter((g) => benefitCode(g) === m.homeCode).map((g, i) => <GoalRow key={i} g={g} />)}</div>
        <div>{goals.filter((g) => benefitCode(g) === m.awayCode).map((g, i) => <GoalRow key={i} g={g} right />)}</div>
      </div>
    </div>
  );
}

// Nhãn trạng thái trận: kết thúc -> "FT"/"AET"/"Pen 3 - 4"; nghỉ giữa hiệp -> "HT";
// đang đá -> phút hiện tại (vd "67'"). Chưa đá -> null (hiện "vs").
function matchStatus(m) {
  if (!m || !m.started) return null;
  if (m.finished) {
    // Phân thắng bại bằng luân lưu -> kèm tỷ số pen (vd "Pen 3 - 4").
    const text = m.penStr && /pen/i.test(m.reasonShort || "") ? `Pen ${m.penStr}` : m.reasonShort || "FT";
    return { text, live: false };
  }
  const short = m.liveShort || m.reasonShort;
  if (short && short.toUpperCase() === "HT") return { text: "HT", live: true };
  return { text: short || "LIVE", live: true };
}

// Modal: avatar + số lượt chọn của một cầu thủ và danh sách HLV đã chọn.
function PickedByModal({ row, mgrInfo, onClose, countLabel = "lượt chọn", listLabel = "HLV đã chọn" }) {
  const managers = row.managers || [];
  useLockBodyScroll();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: avatar + tên + đội + số lượt chọn */}
        <div className="relative flex items-center gap-3 px-5 py-4 border-b border-surface-variant">
          {row.avatar ? (
            <img src={row.avatar} alt="" className="w-16 h-16 object-contain object-bottom shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[40px] bg-gradient-to-b from-[#5ab9d4] via-[#9b3fc4] to-[#f0456f] bg-clip-text text-transparent"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-on-surface text-lg truncate">{row.name}</div>
            {row.team && (
              <div className="flex items-center gap-1.5 text-on-surface-variant text-[12px] truncate">
                {row.flag && <img src={row.flag} alt="" className="w-6 h-4 object-cover rounded-[1px] shrink-0" />}
                <span className="truncate">{row.team}</span>
              </div>
            )}
            <div className="mt-1 font-data-mono text-[13px] text-primary font-bold">
              {row.value} {countLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {/* Danh sách HLV đã chọn */}
        <div className="px-5 py-2 font-label-caps text-label-caps uppercase text-on-surface-variant border-b border-surface-variant">
          {listLabel} ({managers.length})
        </div>
        <ul className="overflow-y-auto overscroll-contain divide-y divide-surface-variant">
          {managers.map((m) => {
            const info = mgrInfo.get(m);
            return (
              <li key={m} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar src={info?.avatar} name={m} />
                <div className="min-w-0">
                  <div className="text-on-surface text-sm truncate">{m}</div>
                  {info?.team && <div className="text-on-surface-variant text-[11px] truncate">{info.team}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function RoundTab({ standings, squads, squadsByRound, roundStats, rounds }) {
  const hasData = useMemo(() => {
    const m = {};
    for (const r of ALL_ROUNDS) {
      m[r.key] =
        standings.some((p) => roundPointsOf(p, r.key) !== 0) ||
        Object.keys(squadsByRound?.[r.key] || {}).length > 0;
    }
    return m;
  }, [standings, squadsByRound]);

  // Mặc định mở vòng mới nhất có dữ liệu, nếu chưa có thì mở Lượt 1.
  const defaultKey = [...ALL_ROUNDS].reverse().find((r) => hasData[r.key])?.key ?? ALL_ROUNDS[0].key;
  const [sel, setSel] = useState(defaultKey);

  const meta = ALL_ROUNDS.find((r) => r.key === sel) ?? ALL_ROUNDS[0];
  // Vòng đã kết thúc -> ẩn cột "Tổng điểm" (tổng tích lũy cả mùa chỉ có nghĩa ở vòng đang diễn ra).
  const selFinished = (rounds || []).find((r) => r.key === sel)?.status === "complete";
  const empty = !hasData[sel];
  const syncedSquads = squadsByRound?.[sel] || {};
  const roundSquads = Object.keys(syncedSquads).length ? syncedSquads : squads;
  // Chỉ số thật từ FotMob cho cầu thủ được pick ở vòng này (key = `teamCode:tên`).
  const fotmobDetail = roundStats?.rounds?.[sel] || null;
  // Kết quả tất cả trận của vòng này (cho tab "Trận" ở cột phải).
  const roundMatches = roundStats?.matches?.[sel] || null;

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
                    <th className={`py-3 px-4 text-center font-bold bg-primary ${selFinished ? "rounded-r-lg" : ""}`}>Điểm {meta.label}</th>
                    {!selFinished && (
                      <th className="py-3 px-2 text-center bg-primary text-on-primary/80 rounded-r-lg">Tổng điểm</th>
                    )}
                  </tr>
                </thead>
                <tbody className="font-data-mono text-data-mono">
                  {ranked.map((p) => {
                    const isBottom = ranked.length > 3 && p.roundRank === ranked.length;
                    const isSel = current?.manager === p.manager;
                    const captain = captainNameOf(roundSquads?.[p.manager]);
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
                            {captain && (
                              <div className="text-on-surface-variant text-[12px] truncate mt-0.5">{captain}</div>
                            )}
                            {p.team && <div className="text-on-surface-variant text-[12px] truncate">{p.team}</div>}
                          </div>
                        </td>
                        <td
                          className={`py-2 px-4 text-center font-bold text-primary text-[16px] ${cellBg} ${selFinished ? "rounded-r-lg" : ""}`}
                          style={ring(selFinished ? { borderRightWidth: 2 } : {})}
                        >
                          {p.rpts}
                        </td>
                        {!selFinished && (
                          <td className={`py-2 px-2 text-center text-on-surface-variant rounded-r-lg ${cellBg}`} style={ring({ borderRightWidth: 2 })}>
                            {p.total ?? p.totalPoints ?? 0}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cột 2: đội hình + kết quả các trận của vòng ngay bên dưới */}
          <div className="flex flex-col gap-gutter min-w-0">
            <ManagerLineup
              manager={current?.manager}
              squad={roundSquads?.[current?.manager]}
              points={current?.rpts}
              chip={current?.chips?.[sel]}
              chipIcon={current?.chips?.[sel] ? <BoosterIcon name={current.chips[sel]} size={22} /> : null}
              fotmobDetail={fotmobDetail}
              roundMatches={roundMatches}
            />

            <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
              <div className="px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant border-b border-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">stadium</span>
                Kết quả các trận
              </div>
              <MatchResults matches={roundMatches} />
            </div>
          </div>

          {/* Thống kê vòng (Pick / Capt / Chip / Top pts) — cột phải ở xl, full-width bên dưới ở mốc nhỏ hơn */}
          <div className="lg:col-span-2 xl:col-span-1">
            <RoundInsights squads={roundSquads} standings={standings} sel={sel} />
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Tab: Thông tin giải đấu — bảng thống kê cầu thủ ---------------- */
// Dữ liệu thật đồng bộ từ FotMob (db.playerStats): groups -> categories -> rows.
// Mỗi category là một bảng xếp hạng dùng chung template LeaderboardCard.

const STAT_COLLAPSED = 5; // số dòng hiển thị khi chưa bung bảng

// Icon material cho từng nhóm thống kê (tab) — group.icon của FotMob không phải ligature hợp lệ.
const STAT_GROUP_ICON = {
  top: "emoji_events",
  attack: "sports_soccer",
  defend: "shield",
  goalkeeping: "sports_handball",
  discipline: "style",
};

// Màu nhấn header + màu giá trị theo nhóm.
const STAT_GROUP_STYLE = {
  top: { accent: "bg-primary text-on-primary", valueColor: "text-primary" },
  attack: { accent: "bg-secondary text-on-secondary", valueColor: "text-secondary" },
  defend: { accent: "bg-tertiary text-on-tertiary", valueColor: "text-tertiary" },
  goalkeeping: { accent: "bg-primary text-on-primary", valueColor: "text-primary" },
  discipline: { accent: "bg-error text-on-error", valueColor: "text-on-surface" },
};

// Icon riêng cho từng hạng mục (theo tên FotMob); thiếu thì rơi về icon nhóm.
const STAT_CAT_ICON = {
  goals: "sports_soccer",
  goal_assist: "handshake",
  _goals_and_goal_assist: "join_inner",
  expected_goals: "sports_soccer",
  ontarget_scoring_att: "my_location",
  total_scoring_att: "sports_soccer",
  big_chance_created: "bolt",
  total_att_assist: "bolt",
  expected_assists: "handshake",
  _expected_goals_and_expected_assists_per_90: "insights",
  big_chance_missed: "dangerous",
  penalty_won: "sports_soccer",
  defensive_contributions: "shield",
  total_tackle: "sports_kabaddi",
  ball_recovery: "autorenew",
  clean_sheet: "verified_user",
  saves: "sports_handball",
  _save_percentage: "percent",
  fouls: "report",
  yellow_card: "style",
  red_card: "style",
};

function formatStatUpdated(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatStatValue(value, dec) {
  if (value == null || Number.isNaN(Number(value))) return "–";
  const n = Number(value);
  return dec > 0 ? n.toFixed(dec) : String(Math.round(n));
}

// Ảnh đại diện trong bảng. Có avatar -> ảnh cắt nền; không có -> icon người gradient
// giống thẻ cầu thủ ở đội hình (bên SquadView).
function StatAvatar({ src }) {
  if (src) {
    return <img src={src} alt="" className="w-[72px] h-[72px] object-contain object-bottom shrink-0" />;
  }
  return (
    <div className="w-[72px] h-[72px] flex items-center justify-center shrink-0">
      <span
        className="material-symbols-outlined select-none bg-gradient-to-b from-[#5ab9d4] via-[#9b3fc4] to-[#f0456f] bg-clip-text text-transparent"
        style={{ fontVariationSettings: "'FILL' 1", fontSize: 56, lineHeight: 1 }}
      >
        person
      </span>
    </div>
  );
}

// Một bảng xếp hạng (vua phá lưới / kiến tạo / xG / cứu thua ...).
// rows: [{ name, team?, flag, avatar?, value }]. Mặc định gấp lại còn STAT_COLLAPSED dòng.
function LeaderboardCard({ icon, title, unit, rows, accent = "bg-primary text-on-primary", valueColor = "text-primary" }) {
  const [open, setOpen] = useState(false);
  const all = rows || [];
  const shown = open ? all : all.slice(0, STAT_COLLAPSED);
  const extra = all.length - STAT_COLLAPSED;

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden flex flex-col">
      <div className={`${accent} font-label-caps text-label-caps uppercase px-4 py-3 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {title}
      </div>
      {shown.length ? (
        <ol className="divide-y divide-surface-variant">
          {shown.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <StatAvatar src={r.avatar} />
              <div className="min-w-0 flex-1">
                <div className={`truncate ${i === 0 && !open ? "font-bold text-on-surface" : "text-on-surface"}`}>{r.name}</div>
                {r.team && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[12px] truncate">
                    {r.flag && (
                      <img src={r.flag} alt="" className="w-6 h-4 object-cover rounded-[2px] shrink-0" />
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
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-label-caps text-label-caps uppercase text-primary hover:bg-surface-container-low transition-colors py-2.5 border-t border-surface-variant"
        >
          {open ? "Thu gọn" : `Xem tất cả (${all.length})`}
        </button>
      )}
      {unit && shown.length > 0 && (
        <p className="px-4 py-2 border-t border-surface-variant font-label-caps text-label-caps text-on-surface-variant uppercase text-right">
          Đơn vị: {unit}
        </p>
      )}
    </div>
  );
}

function TournamentStats({ stats }) {
  const groups = stats.groups || [];
  const [active, setActive] = useState(groups[0]?.key);
  const current = groups.find((g) => g.key === active) || groups[0];
  const updated = formatStatUpdated(stats.updated);
  const style = STAT_GROUP_STYLE[current?.key] || STAT_GROUP_STYLE.top;

  return (
    <div>
      {/* Nguồn + thời điểm sync */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6 text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase">
          <span className="material-symbols-outlined text-[16px]">database</span>
          Nguồn: {stats.sourceUrl ? (
            <a href={stats.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              FotMob
            </a>
          ) : (
            "FotMob"
          )}
        </span>
        {updated && <span className="font-label-caps text-label-caps uppercase">Cập nhật: {updated}</span>}
      </div>

      {/* Tab nhóm thống kê */}
      <div className="flex flex-wrap gap-2 mb-8">
        {groups.map((g) => {
          const on = g.key === current?.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setActive(g.key)}
              className={[
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-label-caps text-label-caps uppercase transition-colors",
                on
                  ? "bg-primary text-on-primary"
                  : "bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[18px]">{STAT_GROUP_ICON[g.key] || "leaderboard"}</span>
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Lưới hạng mục — mỗi bảng dùng template Thông tin giải đấu (hẹp ngang, nhiều cột) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter items-start">
        {(current?.categories || []).map((cat) => (
          <LeaderboardCard
            key={cat.name}
            icon={STAT_CAT_ICON[cat.name] || STAT_GROUP_ICON[current.key] || "leaderboard"}
            title={cat.label}
            unit={cat.unit}
            accent={style.accent}
            valueColor={style.valueColor}
            rows={(cat.rows || []).map((r) => ({
              name: r.player,
              team: r.teamName,
              flag: r.flag,
              avatar: r.avatar,
              value: formatStatValue(r.value, cat.dec),
            }))}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Tab: Thông tin giải đấu ---------------- */
function InfoTab({ playerStats }) {
  if (!playerStats || !(playerStats.groups || []).length) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
        <span className="material-symbols-outlined text-[40px] text-primary">query_stats</span>
        <p className="mt-3 font-bold text-on-surface">Chưa có dữ liệu thống kê</p>
        <p className="text-sm text-on-surface-variant">
          Chạy <span className="font-data-mono">npm run sync-stats</span> để đồng bộ từ FotMob.
        </p>
      </div>
    );
  }
  return <TournamentStats stats={playerStats} />;
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
    name: "Clean Sheet Shield",
    icon: "shield",
    desc: "Mọi thủ môn, hậu vệ hoặc tiền vệ trong đội chỉ mất sạch lưới sau khi thủng lưới 2 bàn (thay vì 1). Dùng cho một vòng knock-out bất kỳ, kể cả chung kết.",
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
    case "Clean Sheet Shield":
    default:
      glyph = (
        <svg viewBox="0 0 48 48" style={sv} aria-hidden="true">
          <path d="M24 7l13 4v11c0 8.4-5.5 14.6-13 17-7.5-2.4-13-8.6-13-17V11l13-4z" fill="#fff" />
          <path d="M18 24l4.5 4.5L31 20" fill="none" stroke={BOOSTER_ORANGE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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

// Dải 5 booster của một HLV: chip đã dùng (màu + nhãn vòng), chip đang dùng vòng này
// (viền nổi bật), chip chưa dùng (mờ). currentKey = vòng đang xét (mới nhất có dữ liệu).
function ManagerChips({ chips, currentKey }) {
  const used = {}; // tên chip -> key vòng đã dùng
  for (const [k, v] of Object.entries(chips || {})) if (v) used[v] = k;
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      {BOOSTERS.map((b) => {
        const roundKey = used[b.name];
        const isUsed = !!roundKey;
        const isActive = isUsed && roundKey === currentKey;
        const roundLabel = ALL_ROUNDS.find((r) => r.key === roundKey)?.label || roundKey;
        const title = isActive
          ? `${b.name} · đang dùng vòng này`
          : isUsed
          ? `${b.name} · đã dùng (${roundLabel})`
          : `${b.name} · chưa dùng`;
        return (
          <div key={b.name} title={title} className="flex flex-col items-center gap-0.5">
            <div
              className={isActive ? "rounded-md ring-2 ring-tertiary ring-offset-1 ring-offset-surface-container-lowest" : ""}
              style={{ opacity: isUsed ? 1 : 0.25, filter: isUsed ? "none" : "grayscale(1)" }}
            >
              <BoosterIcon name={b.name} size={20} />
            </div>
            <span
              className={`font-data-mono text-[9px] leading-none ${
                isActive ? "text-tertiary font-bold" : "text-on-surface-variant"
              }`}
            >
              {isActive ? "● vòng này" : isUsed ? roundLabel : "—"}
            </span>
          </div>
        );
      })}
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
            5 booster (Wildcard, 12th Man, Maximum Captain, Qualification Booster, Clean Sheet Shield) — mỗi loại dùng một lần. Chi tiết ở mục Boosters bên trên.
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
export default function FantasyTabs({ data = null, standings, squads, squadsByRound = {}, roundStats = null, playerStats = null }) {
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
      <div className="mb-8 md:-mx-margin-desktop md:px-margin-desktop md:overflow-x-auto">
        <div className="flex sm:inline-flex w-full sm:w-auto gap-1 p-1 rounded-full bg-surface-container-low border border-outline-variant sm:min-w-max">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-full font-label-caps text-label-caps uppercase whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[18px] hidden sm:inline">{t.icon}</span>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "total" && <TotalTab standings={standings} />}
      {tab === "round" && (
        <RoundTab standings={standings} squads={squads} squadsByRound={squadsByRound} roundStats={roundStats} rounds={data?.rounds} />
      )}
      {tab === "info" && <InfoTab playerStats={playerStats} />}
      {tab === "rules" && <RulesTab />}
    </>
  );
}
