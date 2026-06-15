"use client";

import { useMemo, useState, useEffect } from "react";

const ROWS = [
  { bucket: "GK", label: "Thủ môn (GK)" },
  { bucket: "DEF", label: "Hậu vệ (DEF)" },
  { bucket: "MID", label: "Tiền vệ (MID)" },
  { bucket: "FWD", label: "Tiền đạo (FWD)" },
];

// Nhãn đội trưởng / đội phó, hiển thị giữa phía trên đầu cầu thủ.
function CaptainBadge({ p }) {
  if (!p.isCaptain && !p.isVice) return null;
  return (
    <span
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold leading-none whitespace-nowrap uppercase tracking-wide shadow [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]"
      style={{ background: p.isCaptain ? "#facc15" : "#6b7280", color: "#ffffff" }}
      title={p.isCaptain ? "Đội trưởng" : "Đội phó"}
    >
      {p.isCaptain ? "Capt" : "V. Capt"}
    </span>
  );
}

// Nền bảng tên — đổi giữa 2 mẫu bằng cách sửa dòng này.
const NAMEPLATE_BG = "/players/_nameplate2.png"; // hoặc "/players/_nameplate.png"

// Viết tắt tên: chữ cái đầu của tên + họ. Vd "Jurrien Timber" -> "J. Timber".
function shortName(full = "") {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

const POS_LABEL = { GK: "Thủ môn", DEF: "Hậu vệ", MID: "Tiền vệ", FWD: "Tiền đạo" };

// ---- Chi tiết thống kê vòng (mock, deterministic theo từng cầu thủ) ----
// Cùng một cầu thủ luôn cho ra cùng bộ số (không dùng Math.random/Date).
function hashKey(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return (mod) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return mod > 0 ? s % mod : 0;
  };
}
function computeRoundDetail(p) {
  const rng = makeRng(hashKey(`${p.teamCode}:${p.name}`));
  const ri = (min, max) => min + rng(max - min + 1);
  const mins = p.minutes || 0;
  const f = mins / 90;
  const sc = (base) => Math.max(0, Math.round(base * f));
  const b = p.bucket;
  const isGK = b === "GK", isDEF = b === "DEF", isMID = b === "MID", isFWD = b === "FWD";
  const goals = p.goals || 0, assists = p.assists || 0;
  const xG = p.xG || 0, xA = p.xA || 0;

  const touches = sc(isGK ? 34 : isDEF ? 68 : isMID ? 74 : 44) + ri(0, 8);
  const touchesInBox = isFWD ? ri(1, 6) : isMID ? ri(0, 3) : ri(0, 1);
  const passAtt = Math.max(touches > 0 ? 1 : 0, Math.round(touches * (isGK ? 0.7 : 0.6)));
  const passComp = Math.min(passAtt, Math.round(passAtt * (0.7 + ri(0, 22) / 100)));
  const finalThird = isFWD ? ri(1, 6) : isMID ? ri(2, 9) : ri(0, 4);
  const longAtt = Math.max(0, Math.round(passAtt * 0.08) + (isDEF || isGK ? ri(0, 3) : 0));
  const longComp = Math.min(longAtt, Math.round(longAtt * (0.5 + ri(0, 5) / 10)));

  const shotsOn = Math.max(goals, goals + (isFWD ? ri(0, 2) : isMID ? ri(0, 1) : 0));
  const shotsOff = isFWD ? ri(0, 3) : isMID ? ri(0, 2) : ri(0, 1);
  const shotsTotal = shotsOn + shotsOff;
  const chancesCreated = assists + (isMID ? ri(0, 3) : isFWD ? ri(0, 2) : ri(0, 1));
  const bigMissed = isFWD ? ri(0, 2) : ri(0, 1);
  const dispossessed = ri(0, 3);
  const xGOT = shotsOn > 0 ? Number((xG * (1 + ri(0, 4) / 10) + 0.05).toFixed(2)) : 0;

  const defBias = isDEF ? 1 : isGK ? 0.4 : isMID ? 0.7 : 0.35;
  const tackles = Math.round(ri(0, 4) * defBias) + (isDEF ? 1 : 0);
  const clearances = Math.round(ri(0, 6) * defBias);
  const blocks = Math.round(ri(0, 2) * defBias);
  const interceptions = Math.round(ri(0, 3) * defBias);
  const recoveries = Math.round(ri(1, 8) * (isDEF || isMID ? 1 : 0.5));
  const dribbledPast = ri(0, 3);
  const defActions = tackles + clearances + blocks + interceptions;

  const groundTot = ri(2, 9), groundWon = ri(0, groundTot);
  const aerialTot = isDEF || isFWD ? ri(1, 8) : ri(0, 4);
  const aerialWon = ri(0, aerialTot);
  const foulsWon = ri(0, 3), foulsCommitted = ri(0, 4);

  return {
    minutes: mins, goals, assists, xG, xA, xGOT,
    xGxA: Number((xG + xA).toFixed(2)), npxG: xG,
    passAtt, passComp, finalThird, longAtt, longComp,
    shotsOn, shotsOff, shotsTotal, chancesCreated, bigMissed, dispossessed,
    touches, touchesInBox,
    defActions, tackles, clearances, blocks, interceptions, recoveries, dribbledPast,
    groundTot, groundWon, aerialTot, aerialWon, foulsWon, foulsCommitted,
  };
}

const dec = (n) => (n == null ? "0" : String(n).replace(".", ","));
const frac = (a, b) => `${a}/${b} (${b > 0 ? Math.round((a / b) * 100) : 0}%)`;

// ---- Chỉ số THẬT từ FotMob (db.roundStats) — nhãn tiếng Việt theo `key` ổn định ----
const FOTMOB_STAT_VI = {
  rating_title: "Điểm FotMob",
  minutes_played: "Số phút đã chơi",
  goals: "Bàn thắng",
  assists: "Kiến tạo",
  expected_goals: "Bàn thắng kỳ vọng (xG)",
  expected_goals_on_target_variant: "Sút trúng đích kỳ vọng (xGOT)",
  expected_assists: "Kiến tạo kỳ vọng (xA)",
  xg_and_xa: "xG + xA",
  total_shots: "Tổng số cú sút",
  accurate_passes: "Chuyền bóng chính xác",
  chances_created: "Cơ hội đã tạo ra",
  ShotsOnTarget: "Sút trúng đích",
  ShotsOffTarget: "Sút ra ngoài",
  shot_accuracy: "Sút chính xác",
  defensive_actions: "Hành động phòng ngự",
  touches: "Lượt chạm",
  touches_opp_box: "Chạm tại vùng cấm địch",
  dribbles_succeeded: "Qua người thành công",
  passes_into_final_third: "Chuyền vào 1/3 cuối sân",
  long_balls_accurate: "Bóng dài chính xác",
  dispossessed: "Bị cướp bóng",
  expected_goals_non_penalty: "xG không phạt đền",
  big_chance_missed: "Bỏ lỡ cơ hội lớn",
  "matchstats.headers.tackles": "Tranh bóng",
  shot_blocks: "Cản phá",
  clearances: "Phá bóng",
  headed_clearance: "Phá bóng bằng đầu",
  interceptions: "Chặn cắt",
  recoveries: "Thu hồi bóng",
  dribbled_past: "Bị rê qua",
  ground_duels_won: "Tranh bóng mặt đất thắng",
  aerials_won: "Không chiến thắng",
  was_fouled: "Bị phạm lỗi",
  fouls: "Phạm lỗi",
  duel_won: "Tranh chấp thắng",
  duel_lost: "Tranh chấp thua",
  saves: "Cứu thua",
  goals_conceded: "Bàn thua",
  expected_goals_on_target_faced: "xGOT phải đối mặt",
  goals_prevented: "Bàn thua đã ngăn",
  keeper_diving_save: "Cứu thua bay người",
  saves_inside_box: "Cứu thua trong vòng cấm",
  keeper_sweeper: "Đóng vai trò quét",
  punches: "Đấm bóng",
  player_throws: "Ném phát động",
  keeper_high_claim: "Bắt bóng bổng",
};
const FOTMOB_BLOCK_VI = {
  "Top stats": "Thống kê hàng đầu",
  Attack: "Tấn công",
  Defense: "Phòng ngự",
  Duels: "Tranh bóng",
  Possession: "Kiểm soát bóng",
  Goalkeeping: "Thủ môn",
};
function fmtFotmob(it) {
  const v = it.value;
  if (v == null || it.type === "boolean") return null;
  if (it.type === "fractionWithPercentage" && it.total != null) {
    return `${v}/${it.total} (${it.total ? Math.round((v / it.total) * 100) : 0}%)`;
  }
  return dec(v);
}
// Render các block chỉ số thật từ FotMob (dùng lại StatSection/Stat cho đồng bộ giao diện).
function FotmobStatBlocks({ fm }) {
  return (
    <>
      {(fm.stats || []).map((block) => {
        const items = (block.items || [])
          .map((it) => ({ ...it, fmt: fmtFotmob(it) }))
          .filter((it) => it.fmt != null);
        if (!items.length) return null;
        return (
          <StatSection key={block.title} title={FOTMOB_BLOCK_VI[block.title] || block.title}>
            {items.map((it, i) => (
              <Stat key={i} label={FOTMOB_STAT_VI[it.key] || it.label} value={it.fmt} />
            ))}
          </StatSection>
        );
      })}
    </>
  );
}

// Một dòng thống kê (nhãn trái – giá trị phải).
function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] odd:bg-black/[0.035]">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-data-mono font-semibold text-on-surface tabular-nums">{value}</span>
    </div>
  );
}
function StatSection({ title, children }) {
  return (
    <div className="mt-3">
      <div className="px-3 py-1 text-label-caps font-label-caps uppercase tracking-wide text-primary rounded-md bg-primary/10">
        {title}
      </div>
      <div className="mt-1 rounded-md overflow-hidden border border-black/5">{children}</div>
    </div>
  );
}

// ---- Breakdown điểm FIFA (như popup chính thức) ----
// Điểm/bàn theo vị trí (luật World Cup 2026 Fantasy, khớp tab Luật).
const GOAL_PTS = { GK: 9, DEF: 7, MID: 6, FWD: 5 };
const CS_PTS = { GK: 5, DEF: 5, MID: 1, FWD: 0 };
// Tính điểm từng hạng mục từ stat thô FIFA. Tổng hiển thị vẫn lấy số chính thức (fifa.points).
function fifaBreakdownRows(bucket, s) {
  const n = (k) => Number(s?.[k] || 0);
  const rows = [];
  const MP = n("MP");
  if (MP > 0) rows.push({ label: "Số phút thi đấu", value: MP > 90 ? 90 : MP, pts: MP >= 60 ? 2 : 1 });
  if (n("GS")) rows.push({ label: "Bàn thắng", value: n("GS"), pts: n("GS") * (GOAL_PTS[bucket] ?? 5) });
  if (n("AS")) rows.push({ label: "Kiến tạo", value: n("AS"), pts: n("AS") * 3 });
  if (n("CS") && MP >= 60 && CS_PTS[bucket]) rows.push({ label: "Giữ sạch lưới", value: n("CS"), pts: CS_PTS[bucket] });
  if (bucket === "GK" && n("S")) rows.push({ label: "Cứu thua", value: n("S"), pts: Math.floor(n("S") / 3) });
  if (bucket === "MID" && n("T")) rows.push({ label: "Tắc bóng", value: n("T"), pts: Math.floor(n("T") / 3) });
  if (bucket === "MID" && n("CC")) rows.push({ label: "Cơ hội tạo ra", value: n("CC"), pts: Math.floor(n("CC") / 2) });
  if (bucket === "FWD" && n("ST")) rows.push({ label: "Sút trúng đích", value: n("ST"), pts: Math.floor(n("ST") / 2) });
  if ((bucket === "GK" || bucket === "DEF") && n("GC"))
    rows.push({ label: "Bàn thua", value: n("GC"), pts: -Math.max(0, n("GC") - 1) });
  if (n("PW")) rows.push({ label: "Kiếm được penalty", value: n("PW"), pts: n("PW") * 2 });
  if (n("PS")) rows.push({ label: "Cản penalty", value: n("PS"), pts: n("PS") * 3 });
  if (n("PC")) rows.push({ label: "Để mất penalty", value: n("PC"), pts: -n("PC") });
  if (n("OG")) rows.push({ label: "Phản lưới nhà", value: n("OG"), pts: -2 * n("OG") });
  if (n("YC")) rows.push({ label: "Thẻ vàng", value: n("YC"), pts: -n("YC") });
  if (n("RC")) rows.push({ label: "Thẻ đỏ", value: n("RC"), pts: -2 * n("RC") });
  return rows;
}
const ptsStr = (x) => (x > 0 ? `+${x}` : String(x));
function FifaBreakdown({ fifa, bucket }) {
  const rows = fifaBreakdownRows(bucket, fifa.stats);
  return (
    <div className="mt-3">
      <div className="px-3 py-1 text-label-caps font-label-caps uppercase tracking-wide text-primary rounded-md bg-primary/10">
        Bảng điểm (FIFA)
      </div>
      <div className="mt-1 rounded-md overflow-hidden border border-black/5">
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-[11px] font-label-caps uppercase text-on-surface-variant bg-black/[0.04]">
          <span>Hạng mục</span>
          <span className="flex items-center gap-3"><span className="w-10 text-right">Giá trị</span><span className="w-8 text-right">Điểm</span></span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] odd:bg-black/[0.035]">
            <span className="text-on-surface-variant">{r.label}</span>
            <span className="flex items-center gap-3 font-data-mono tabular-nums">
              <span className="w-10 text-right text-on-surface">{r.value}</span>
              <span className={`w-8 text-right font-bold ${r.pts > 0 ? "text-tertiary" : r.pts < 0 ? "text-error" : "text-on-surface-variant"}`}>{ptsStr(r.pts)}</span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] border-t border-black/10 bg-primary/5">
          <span className="font-bold text-on-surface">Tổng điểm</span>
          <span className="font-data-mono font-bold text-primary tabular-nums">{ptsStr(Number(fifa.points || 0))}</span>
        </div>
      </div>
    </div>
  );
}

// Popup chi tiết cầu thủ trong vòng hiện tại.
function PlayerStatsModal({ p, fotmobDetail, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Khóa cuộn trang nền khi modal mở (tránh cuộn lan ra trang chính).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Chỉ số THẬT từ FotMob cho cầu thủ này ở vòng đang xem (nếu đã sync + có thi đấu).
  const fm = p && fotmobDetail ? fotmobDetail[`${p.teamCode}:${p.name}`] : null;
  const useReal = !!(fm && fm.played && fm.stats && fm.stats.length);
  // Không có FIFA lẫn FotMob -> fallback bộ số mock cũ (deterministic) để giao diện không trống.
  const d = useMemo(() => (!useReal && !p?.fifa && p?.played ? computeRoundDetail(p) : null), [p, useReal]);
  if (!p) return null;

  const shownPts = p.displayPoints ?? p.points;
  const played = p.played || (useReal && fm.played);
  const shownMinutes = p.minutes == null ? p.minutes : Math.min(90, p.minutes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-black/10 shadow-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header cố định trên cùng (không nằm trong vùng cuộn) */}
        <div className="shrink-0 bg-white px-4 pt-4 pb-3 flex flex-col items-center gap-1.5 border-b border-black/10">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <img
              src={p.avatar || "/players/_placeholder.png"}
              alt=""
              className={`object-contain ${p.avatar ? "w-full h-full" : "w-2/3 h-2/3 opacity-70"}`}
              style={
                p.avatar
                  ? {
                      maskImage: "linear-gradient(to bottom, #000 60%, transparent 95%)",
                      WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent 95%)",
                    }
                  : undefined
              }
              onError={(e) => {
                if (e.currentTarget.src.indexOf("_placeholder.png") === -1) {
                  e.currentTarget.src = "/players/_placeholder.png";
                }
              }}
            />
          </div>
          <div className="min-w-0 w-full text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-bold text-on-surface text-lg truncate">{p.name}</span>
              {p.isCaptain && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-400 text-black leading-none">C</span>
              )}
              {p.isVice && !p.isCaptain && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-400 text-black leading-none">V</span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-[12px] text-on-surface-variant font-data-mono">
              {p.crest && <img src={p.crest} alt="" className="w-5 h-3.5 object-cover rounded-[1px]" />}
              <span className="truncate">{p.teamName || p.teamCode}</span>
              <span className="text-on-surface-variant/50">·</span>
              <span>{POS_LABEL[p.bucket] || ""}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-2 text-[12px] font-data-mono">
              {played && (
                <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400/50 font-bold">
                  {shownPts} pts
                </span>
              )}
              {useReal && fm.rating != null && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400/50 font-bold" title="Điểm FotMob trận này">
                  {Number(fm.rating).toFixed(1)} ⭐
                </span>
              )}
              {played ? (
                <span className="text-on-surface-variant">{shownMinutes}&apos; thi đấu</span>
              ) : (
                <span className="text-on-surface-variant">vs {p.oppCode || "?"} · {p.matchDate}</span>
              )}
            </div>
          </div>
        </div>

        {/* Body (vùng cuộn — thanh cuộn chỉ nằm ở đây) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 hover:[&::-webkit-scrollbar-thumb]:bg-black/30">
          {!played ? (
            <div className="py-10 text-center text-on-surface-variant">
              <div className="material-symbols-outlined text-4xl text-on-surface-variant/60">{p.dnp ? "do_not_disturb_on" : "schedule"}</div>
              <div className="mt-2 font-bold">{p.dnp ? "Không ra sân vòng này" : "Chưa thi đấu vòng này"}</div>
              <div className="mt-1 text-[13px] font-data-mono">
                Gặp {p.oppName || p.oppCode || "?"} · {p.matchDate}
              </div>
            </div>
          ) : p.fifa || useReal ? (
            <>
              {p.fifa && <FifaBreakdown fifa={p.fifa} bucket={p.bucket} />}
              {useReal && <FotmobStatBlocks fm={fm} />}
            </>
          ) : !d ? (
            <div className="py-10 text-center text-on-surface-variant">
              <div className="material-symbols-outlined text-4xl text-on-surface-variant/60">{p.dnp ? "do_not_disturb_on" : "schedule"}</div>
              <div className="mt-2 font-bold">{p.dnp ? "Không ra sân vòng này" : "Chưa thi đấu vòng này"}</div>
              <div className="mt-1 text-[13px] font-data-mono">
                Gặp {p.oppName || p.oppCode || "?"} · {p.matchDate}
              </div>
            </div>
          ) : (
            <>
              <StatSection title="Thống kê hàng đầu">
                <Stat label="Số phút đã chơi" value={d.minutes} />
                <Stat label="Bàn thắng" value={d.goals} />
                <Stat label="Kiến tạo" value={d.assists} />
                <Stat label="Bàn thắng kỳ vọng (xG)" value={dec(d.xG)} />
                <Stat label="Số cú sút trúng khung thành dự kiến (xGOT)" value={dec(d.xGOT)} />
                <Stat label="Kiến tạo kỳ vọng (xA)" value={dec(d.xA)} />
                <Stat label="xG + xA" value={dec(d.xGxA)} />
                <Stat label="Chuyền bóng chính xác" value={frac(d.passComp, d.passAtt)} />
                <Stat label="Các cơ hội đã tạo ra" value={d.chancesCreated} />
                <Stat label="Sút trúng đích" value={d.shotsOn} />
                <Stat label="Sút ra ngoài" value={d.shotsOff} />
                <Stat label="Sút chính xác" value={frac(d.shotsOn, d.shotsTotal)} />
              </StatSection>

              <StatSection title="Tấn công">
                <Stat label="Bỏ lỡ cơ hội lớn" value={d.bigMissed} />
                <Stat label="Lượt chạm" value={d.touches} />
                <Stat label="Chạm tại vùng phạt địch" value={d.touchesInBox} />
                <Stat label="Chuyền vào một phần ba cuối sân" value={d.finalThird} />
                <Stat label="Bóng dài chính xác" value={frac(d.longComp, d.longAtt)} />
                <Stat label="Bị cướp bóng" value={d.dispossessed} />
                <Stat label="xG không phạt đền" value={dec(d.npxG)} />
              </StatSection>

              <StatSection title="Phòng ngự">
                <Stat label="Hành động phòng ngự" value={d.defActions} />
                <Stat label="Tranh bóng" value={d.tackles} />
                <Stat label="Cản phá" value={d.blocks} />
                <Stat label="Phá bóng" value={d.clearances} />
                <Stat label="Chặn" value={d.interceptions} />
                <Stat label="Thu hồi bóng" value={d.recoveries} />
                <Stat label="Bị rê bóng qua" value={d.dribbledPast} />
              </StatSection>

              <StatSection title="Tranh bóng">
                <Stat label="Tranh bóng trên đất" value={frac(d.groundWon, d.groundTot)} />
                <Stat label="Tranh được bóng trên không" value={frac(d.aerialWon, d.aerialTot)} />
                <Stat label="Bị phạm lỗi" value={d.foulsWon} />
                <Stat label="Phạm lỗi" value={d.foulsCommitted} />
              </StatSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Các chế độ thông tin cho cầu thủ chưa đá.
const INFO_MODES = [
  { key: "opp", label: "Đối thủ", icon: "sports_soccer" },
  { key: "date", label: "Ngày", icon: "event" },
  { key: "price", label: "Giá", icon: "payments" },
];

// Chip thông tin trận sắp tới / giá cho cầu thủ chưa đá.
function UpcomingInfo({ p, mode }) {
  let icon = "sports_soccer";
  let body = `vs ${p.oppCode || "?"}`;
  if (mode === "date") {
    icon = "event";
    body = p.matchDate;
  } else if (mode === "price") {
    icon = "payments";
    body = `$${p.price.toFixed(1)}M`;
  }
  return (
    <div className="mt-0.5 flex justify-center font-data-mono">
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-bold bg-white/10 text-white/90 ring-1 ring-white/25"
        title={`Chưa thi đấu · ${p.oppName || "?"} · ${p.matchDate}`}
      >
        {mode === "opp" && p.oppCrest ? (
          <img src={p.oppCrest} alt="" className="w-4 h-4 object-contain rounded-[1px]" />
        ) : (
          <span className="material-symbols-outlined text-[15px]">{icon}</span>
        )}
        {body}
      </span>
    </div>
  );
}

// Nhãn cho cầu thủ đã có trận nhưng không được ra sân (DNP).
function DnpInfo() {
  return (
    <div className="mt-0.5 flex justify-center font-data-mono">
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-white/10 text-white/70 ring-1 ring-white/20"
        title="Trận đã diễn ra nhưng cầu thủ không được ra sân"
      >
        <span className="material-symbols-outlined text-[14px]">do_not_disturb_on</span>
        Không ra sân
      </span>
    </div>
  );
}

function PlayerCard({ p, compact, infoMode = "opp", onSelect, twelfth = false }) {
  const size = compact ? "w-28 h-32" : "w-32 h-36";
  const shownPts = p.displayPoints ?? p.points;
  // `p.points` đã gồm x2 đội trưởng (tính ở bước sync) -> so với rawPoints để biết có nhân đôi.
  const captainDoubled = p.isCaptain && Number(p.points || 0) !== Number(p.rawPoints ?? p.points);
  // Đã đá xong nhưng cầu thủ không được ra sân -> làm mờ thẻ, hiện nhãn "Không ra sân".
  const dnp = !!p.dnp;
  const borderCls = twelfth
    ? "border-[#9b3fc4] bg-[#9b3fc4]/10 shadow-[0_0_14px_rgba(155,63,196,0.55)]"
    : p.isCaptain
    ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_14px_rgba(250,204,21,0.55)]"
    : "border-white/15 bg-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.35)]";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(p)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect?.(p))}
      title="Xem thống kê chi tiết"
      className={`relative flex flex-col items-center rounded-xl border-2 backdrop-blur-[1px] px-1.5 pt-2 pb-1.5 cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${borderCls} ${compact ? "w-[134px]" : "w-[150px]"} ${dnp ? "opacity-55 grayscale-[35%]" : ""}`}
    >
      {twelfth && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.5 rounded bg-[#9b3fc4] text-white text-[9px] font-bold uppercase leading-none shadow tracking-wide">
          12th
        </span>
      )}
      <CaptainBadge p={p} />
      <div className={`relative ${size} flex items-center justify-center`}>
        {/* Góc trái: cờ nước + mã đội, C/V ở dưới */}
        <div className="absolute -top-1 -left-1 z-10 flex flex-col items-start gap-0.5">
          <span
            title={p.teamName || p.teamCode}
            className="inline-flex flex-col items-center gap-0.5 px-1 py-0.5 rounded bg-black/60 border border-white/30 leading-none shadow"
          >
            <span className="text-[10px] font-data-mono font-bold text-white">{p.teamCode}</span>
            {p.crest && <img src={p.crest} alt="" className="w-5 h-3.5 object-cover rounded-[1px]" />}
          </span>
        </div>
        {/* Góc phải: số phút, điểm ở dưới */}
        <div className="absolute -top-1 -right-1 z-10 flex flex-col items-end gap-0.5">
          {p.played && (
            <span
              title="Số phút đã thi đấu"
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 border border-green-400/70 text-[12px] font-data-mono font-bold leading-none text-green-400 shadow"
            >
              {Math.min(90, p.minutes)}<span className="text-[9px] ml-0.5">'</span>
            </span>
          )}
          {/* Chưa đá thì không hiện điểm (tránh "0pts" gây hiểu nhầm) */}
          {p.played && (
            <span
              title={captainDoubled ? "Điểm (đội trưởng ×2)" : "Điểm"}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 border border-yellow-400/70 text-[12px] font-data-mono font-bold leading-none text-yellow-400 shadow"
            >
              {shownPts}<span className="text-[9px] ml-0.5">pts</span>
            </span>
          )}
        </div>
        {p.avatar ? (
          <img
            src={p.avatar}
            alt=""
            className="relative object-contain w-full h-full"
            style={{
              maskImage: "linear-gradient(to bottom, #000 45%, transparent 96%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 45%, transparent 96%)",
            }}
          />
        ) : (
          <span
            className="material-symbols-outlined select-none -translate-y-[3px] bg-gradient-to-b from-[#5ab9d4] via-[#9b3fc4] to-[#f0456f] bg-clip-text text-transparent"
            style={{
              fontVariationSettings: "'FILL' 1",
              fontSize: compact ? 70 : 84,
              lineHeight: 1,
              maskImage: "linear-gradient(to bottom, #000 45%, transparent 96%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 45%, transparent 96%)",
            }}
          >
            person
          </span>
        )}
        {/* Tên đè lên phần dưới avatar, nền bảng baroque (giữ tỉ lệ, không bóp dẹp) */}
        <div className="absolute bottom-1 inset-x-0 z-10 flex justify-center">
          <div
            className={`relative ${compact ? "w-[136px]" : "w-[164px]"} shrink-0 aspect-[12/3] bg-no-repeat bg-center bg-cover flex items-center justify-center`}
            style={{ backgroundImage: `url(${NAMEPLATE_BG})` }}
          >
            <div
              title={p.name}
              className={`${compact ? "px-5" : "px-7"} text-center text-[11px] font-bold tracking-wide text-yellow-50 truncate leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]`}
            >
              {shortName(p.name)}
            </div>
          </div>
        </div>
      </div>
      <div className="-mt-1 w-full text-center px-1 leading-tight">
        {!p.played ? (
          dnp ? (
            <DnpInfo />
          ) : (
            <UpcomingInfo p={p} mode={infoMode} />
          )
        ) : !compact ? (
          p.bucket === "GK" ? (
            <div className="mt-0.5 flex justify-center font-data-mono">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/40" title="Số pha cứu thua">
                <span className="material-symbols-outlined text-[12px]">sports_handball</span>
                {p.saves} cứu thua
              </span>
            </div>
          ) : (
            <div className="mt-0.5 flex justify-center gap-1 font-data-mono">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-bold bg-amber-500/35 text-amber-100 ring-1 ring-amber-300/60" title="Bàn thắng kỳ vọng">
                <span className="opacity-80 text-[10px]">xG</span>{Number(p.xG ?? 0).toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-bold bg-violet-500/35 text-violet-100 ring-1 ring-violet-300/60" title="Kiến tạo kỳ vọng">
                <span className="opacity-80 text-[10px]">xA</span>{Number(p.xA ?? 0).toFixed(2)}
              </span>
            </div>
          )
        ) : null}
        {/* Bàn thắng/kiến tạo (chỉ khi đã đá, thủ môn bỏ qua): cao cố định để mọi thẻ bằng nhau.
            Dự bị chưa đá thì bỏ hẳn dòng này (đã có chip lịch/ngày/giá ở trên). */}
        {(p.played || !compact) && (
          <div className="mt-0.5 h-5 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-[13px] leading-none">
            {p.played && p.bucket !== "GK" && p.goals > 0 && (
              <span className="inline-flex items-center gap-0.5" title={`${p.goals} bàn thắng`}>
                ⚽<span className="font-data-mono font-bold text-[13px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">{p.goals}</span>
              </span>
            )}
            {p.played && p.bucket !== "GK" && p.assists > 0 && (
              <span className="inline-flex items-center gap-0.5" title={`${p.assists} kiến tạo`}>
                👟<span className="font-data-mono font-bold text-[13px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">{p.assists}</span>
              </span>
            )}
            {/* Tiền vệ: tắc bóng — chỉ hiện khi có ít nhất 1 pha tắc */}
            {p.played && !compact && p.bucket === "MID" && p.tackles > 0 && (
              <span className="inline-flex items-center gap-0.5" title={`${p.tackles} pha tắc bóng`}>
                🛡️<span className="font-data-mono font-bold text-[13px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">{p.tackles}</span>
              </span>
            )}
            {/* Tiền vệ: cơ hội tạo ra — chỉ hiện khi > 0 */}
            {p.played && !compact && p.bucket === "MID" && p.chancesCreated > 0 && (
              <span className="inline-flex items-center gap-0.5" title={`${p.chancesCreated} cơ hội tạo ra`}>
                🔑<span className="font-data-mono font-bold text-[13px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">{p.chancesCreated}</span>
              </span>
            )}
            {/* Tiền đạo: cú sút trúng đích — chung hàng & cùng style emoji */}
            {p.played && !compact && p.bucket === "FWD" && p.sot != null && (
              <span className="inline-flex items-center gap-0.5" title={`${p.sot} cú sút trúng đích`}>
                🎯<span className="font-data-mono font-bold text-[13px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">{p.sot}</span>
              </span>
            )}
            {p.played &&
              ((p.bucket !== "GK" &&
                p.goals === 0 &&
                p.assists === 0 &&
                !(!compact && p.bucket === "MID" && (p.tackles > 0 || p.chancesCreated > 0)) &&
                !(!compact && p.bucket === "FWD" && p.sot != null)) ||
                (p.bucket === "GK" && compact)) && (
                <span className="text-white/35" title="Không có bàn thắng / kiến tạo">—</span>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

function Pitch({ squad, infoMode, onSelect, twelfthMan }) {
  const byBucket = useMemo(() => {
    const m = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of squad.starters) (m[p.bucket] || (m[p.bucket] = [])).push(p);
    return m;
  }, [squad]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-white/10 px-3 py-6 sm:px-6"
      style={{ background: "linear-gradient(180deg,#33415a 0%,#27324a 55%,#1b2336 100%)" }}
    >
      {/* vạch sân trang trí */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-x-6 top-1/2 h-px bg-white/40" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/40" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-12 border border-white/40 border-t-0" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-12 border border-white/40 border-b-0" />
      </div>

      {/* 12th Man — cầu thủ thứ 12 thêm vào ở góc trên bên trái, viền xanh + nhãn "12th" */}
      {twelfthMan && (
        <div className="absolute top-2 left-2 z-20">
          <PlayerCard p={twelfthMan} compact twelfth infoMode={infoMode} onSelect={onSelect} />
        </div>
      )}

      <div className="relative space-y-5 sm:space-y-7">
        {ROWS.map((r) => (
          <div key={r.bucket} className="flex justify-center gap-2 sm:gap-4 flex-wrap">
            {(byBucket[r.bucket] || []).map((p) => (
              <PlayerCard key={`${p.teamCode}:${p.name}`} p={p} infoMode={infoMode} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bench({ squad, infoMode, onSelect }) {
  return (
    <div className="mt-4 bg-surface-container-low border border-outline-variant rounded-xl p-3">
      <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">event_seat</span>
        Ghế dự bị (Bench)
      </div>
      <div className="flex justify-around gap-2 flex-wrap rounded-lg py-3" style={{ background: "linear-gradient(180deg,#27324a,#1b2336)" }}>
        {squad.bench.map((p) => (
          <PlayerCard key={`${p.teamCode}:${p.name}`} p={p} compact infoMode={infoMode} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// Chú thích icon trên thẻ cầu thủ.
const LEGEND = [
  { icon: "⚽", label: "Bàn thắng" },
  { icon: "👟", label: "Kiến tạo" },
  { icon: "🛡️", label: "Tắc bóng (tiền vệ)" },
  { icon: "🔑", label: "Cơ hội tạo ra (tiền vệ)" },
  { icon: "🎯", label: "Sút trúng đích (tiền đạo)" },
];
function StatLegend() {
  return (
    <div className="mb-3 px-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
      <span className="font-label-caps uppercase tracking-wide text-on-surface-variant/70">Chú thích:</span>
      {LEGEND.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1 whitespace-nowrap">
          <span>{it.icon}</span>
          {it.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span className="text-amber-700 font-bold">xG</span>/<span className="text-violet-700 font-bold">xA</span> bàn thắng / kiến tạo kỳ vọng
      </span>
    </div>
  );
}

// Panel đội hình (bên phải bảng xếp hạng Round). Nhận manager đang chọn + squad của họ.
export function ManagerLineup({ manager, squad, points, chip, chipIcon, fotmobDetail = null, roundMatches = null }) {
  const [infoMode, setInfoMode] = useState("opp");
  const [selected, setSelected] = useState(null);

  // Trạng thái trận theo cặp mã đội (để phân biệt "chưa đá" vs "đã đá nhưng không ra sân").
  const matchByPair = useMemo(() => {
    const m = new Map();
    for (const mt of roundMatches || []) {
      if (mt.homeCode && mt.awayCode) m.set([mt.homeCode, mt.awayCode].sort().join("-"), mt);
    }
    return m;
  }, [roundMatches]);

  // displayPoints: điểm hiển thị trên thẻ. `p.points` ĐÃ gồm phần nhân đôi đội
  // trưởng do bước sync tính (xem makePlayer trong fantasy-sync-utils) — KHÔNG
  // nhân đôi lại ở đây, nếu không điểm đội trưởng sẽ bị gấp đôi 2 lần.
  // Với Maximum Captain: băng đội trưởng tự chuyển sang starter điểm cao nhất
  // (ghi đè dữ liệu sync); phần nhân đôi là hiệu ứng booster nằm ở dòng
  // "Điều chỉnh FIFA" (xem luật trong RulesTab).
  const squadView = useMemo(() => {
    if (!squad) return squad;
    const isMaxCaptain = chip === "Maximum Captain";

    // Số trên thẻ (bàn/kiến tạo/tắc/sút trúng/phút/cứu thua) DÙNG FIFA — đã nhúng trong squadsByRound,
    // khớp với điểm. FotMob chỉ bổ sung xG/xA (FIFA không có) + điểm phong độ (rating) cho modal.
    const applyFm = (p) => {
      // Trận của cầu thủ đã KẾT THÚC chưa? -> chỉ kết luận "không ra sân" khi trận đã xong,
      // tránh báo nhầm lúc đang đá (FIFA/FotMob chưa kịp cập nhật chỉ số).
      const mt = p.oppCode ? matchByPair.get([p.teamCode, p.oppCode].sort().join("-")) : null;
      const matchOver = !!mt?.finished;
      const fm = fotmobDetail?.[`${p.teamCode}:${p.name}`];

      // "Đã đá thật" = có chỉ số FIFA (MP chính xác) HOẶC FotMob xác nhận ra sân.
      // KHÔNG tin p.played khi thiếu FIFA, vì lúc đó nó đến từ fallback fixture (gắn nhầm
      // unused-sub là đã đá, vd minutes 98 ảo). dnp = trận đã xong nhưng không có bằng chứng ra sân.
      const reallyPlayed = p.fifa ? !!p.played : !!(fm && fm.played);
      const dnp = matchOver && !reallyPlayed;

      const base = { ...p, dnp, played: reallyPlayed };
      if (!fm) return base;
      return {
        ...base,
        xG: fm.xG != null ? fm.xG : p.xG,
        xA: fm.xA != null ? fm.xA : p.xA,
        fmRating: fm.rating,
      };
    };

    let starters = (squad.starters || []).map(applyFm);

    // 12th Man thường nằm TRONG starters (cờ isTwelfthMan) chứ không phải field riêng.
    // Tách ra để hiển thị riêng ở góc trên-trái sân và không tính vào sơ đồ 11 người.
    let twelfthMan = squad.twelfthMan ? applyFm(squad.twelfthMan) : null;
    if (!twelfthMan) {
      const idx = starters.findIndex((p) => p.isTwelfthMan);
      if (idx >= 0) {
        twelfthMan = starters[idx];
        starters = starters.filter((_, i) => i !== idx);
      }
    }

    if (isMaxCaptain && starters.length) {
      let topIdx = 0;
      starters.forEach((p, i) => {
        if (Number(p.points || 0) > Number(starters[topIdx].points || 0)) topIdx = i;
      });
      starters = starters.map((p, i) => ({ ...p, isCaptain: i === topIdx, isVice: false }));
    }

    const withDisplay = (list) =>
      list.map((p) => ({ ...p, displayPoints: Number(p.points || 0) }));

    return {
      ...squad,
      starters: withDisplay(starters),
      bench: withDisplay((squad.bench || []).map(applyFm)),
      twelfthMan: twelfthMan ? withDisplay([twelfthMan])[0] : null,
    };
  }, [squad, chip, fotmobDetail, matchByPair]);

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-2 sm:p-4 self-start">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div className="min-w-0">
          <div className="font-bold text-on-surface truncate">{manager}</div>
        </div>
        {squad && (
          <div className="text-right shrink-0">
            <div className="font-data-mono text-sm text-on-surface">
              Sơ đồ <span className="font-bold">{squad.formation}</span>
            </div>
            <div className="font-data-mono text-[12px] text-on-surface-variant">
              Giá trị {squad.squadValue}M{points != null ? ` · ${points} pts` : ""}
            </div>
          </div>
        )}
      </div>

      {squad ? (
        <>
          {/* Cầu thủ chưa đá hiển thị thông tin gì — chuyển đổi tại đây */}
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            {chip ? (
              <div className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-tertiary/15 ring-1 ring-tertiary/30 pl-1 pr-2.5 py-0.5">
                {chipIcon}
                <span className="font-label-caps text-label-caps uppercase text-tertiary">
                  Booster: {chip}
                </span>
              </div>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-on-surface-variant">Chưa đá hiện:</span>
              <div className="inline-flex gap-0.5 p-0.5 rounded-full bg-surface-container-low border border-outline-variant">
                {INFO_MODES.map((m) => {
                const active = infoMode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setInfoMode(m.key)}
                    title={m.label}
                    className={[
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-label-caps uppercase transition-colors",
                      active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-primary",
                    ].join(" ")}
                  >
                    <span className="material-symbols-outlined text-[14px]">{m.icon}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
            </div>
          </div>
          <StatLegend />
          <Pitch
            squad={squadView}
            infoMode={infoMode}
            onSelect={setSelected}
            twelfthMan={chip === "12th Man" ? squadView.twelfthMan : null}
          />
          <Bench squad={squadView} infoMode={infoMode} onSelect={setSelected} />
          {selected && <PlayerStatsModal p={selected} fotmobDetail={fotmobDetail} onClose={() => setSelected(null)} />}
        </>
      ) : (
        <div className="p-10 text-center text-on-surface-variant">Chưa có đội hình cho người chơi này.</div>
      )}
    </div>
  );
}
