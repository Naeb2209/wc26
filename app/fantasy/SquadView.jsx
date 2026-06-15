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

// Popup chi tiết cầu thủ trong vòng hiện tại.
function PlayerStatsModal({ p, onClose }) {
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

  const d = useMemo(() => (p?.played ? computeRoundDetail(p) : null), [p]);
  if (!p) return null;

  const shownPts = p.displayPoints ?? p.points;

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
              <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400/50 font-bold">
                {shownPts} pts
              </span>
              {p.played ? (
                <span className="text-on-surface-variant">{p.minutes}&apos; thi đấu</span>
              ) : (
                <span className="text-on-surface-variant">vs {p.oppCode || "?"} · {p.matchDate}</span>
              )}
            </div>
          </div>
        </div>

        {/* Body (vùng cuộn — thanh cuộn chỉ nằm ở đây) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 hover:[&::-webkit-scrollbar-thumb]:bg-black/30">
          {!p.played || !d ? (
            <div className="py-10 text-center text-on-surface-variant">
              <div className="material-symbols-outlined text-4xl text-on-surface-variant/60">schedule</div>
              <div className="mt-2 font-bold">Chưa thi đấu vòng này</div>
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

function PlayerCard({ p, compact, infoMode = "opp", onSelect, twelfth = false }) {
  const size = compact ? "w-28 h-32" : "w-32 h-36";
  const shownPts = p.displayPoints ?? p.points;
  const captainDoubled = p.isCaptain && Number(shownPts) !== Number(p.points || 0);
  const borderCls = twelfth
    ? "border-green-500 bg-green-500/10 shadow-[0_0_14px_rgba(34,197,94,0.5)]"
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
      className={`relative flex flex-col items-center rounded-xl border-2 backdrop-blur-[1px] px-1.5 pt-2 pb-1.5 cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${borderCls} ${compact ? "w-[134px]" : "w-[150px]"}`}
    >
      {twelfth && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.5 rounded bg-green-500 text-white text-[9px] font-bold uppercase leading-none shadow tracking-wide">
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
              {p.minutes}<span className="text-[9px] ml-0.5">'</span>
            </span>
          )}
          <span
            title={captainDoubled ? "Điểm (đội trưởng ×2)" : "Điểm"}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 border border-yellow-400/70 text-[12px] font-data-mono font-bold leading-none text-yellow-400 shadow"
          >
            {shownPts}<span className="text-[9px] ml-0.5">pts</span>
          </span>
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
          <UpcomingInfo p={p} mode={infoMode} />
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
                <span className="opacity-80 text-[10px]">xG</span>{p.xG}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-bold bg-violet-500/35 text-violet-100 ring-1 ring-violet-300/60" title="Kiến tạo kỳ vọng">
                <span className="opacity-80 text-[10px]">xA</span>{p.xA}
              </span>
            </div>
          )
        ) : null}
        {/* Bàn thắng/kiến tạo (chỉ khi đã đá, thủ môn bỏ qua): cao cố định để mọi thẻ bằng nhau.
            Dự bị chưa đá thì bỏ hẳn dòng này (đã có chip lịch/ngày/giá ở trên). */}
        {(p.played || !compact) && (
          <div className="mt-0.5 h-4 flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] leading-none">
            {p.played && p.bucket !== "GK" && p.goals > 0 && <span title={`${p.goals} bàn thắng`}>{"⚽".repeat(p.goals)}</span>}
            {p.played && p.bucket !== "GK" && p.assists > 0 && <span title={`${p.assists} kiến tạo`}>{"👟".repeat(p.assists)}</span>}
            {p.played &&
              ((p.bucket !== "GK" && p.goals === 0 && p.assists === 0) ||
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

// Panel đội hình (bên phải bảng xếp hạng Round). Nhận manager đang chọn + squad của họ.
export function ManagerLineup({ manager, squad, points, chip, chipIcon }) {
  const [infoMode, setInfoMode] = useState("opp");
  const [selected, setSelected] = useState(null);

  // displayPoints: điểm hiển thị trên thẻ. Đội trưởng được nhân đôi.
  // Với Maximum Captain: băng đội trưởng tự chuyển sang starter điểm cao nhất
  // (ghi đè dữ liệu sync), nhưng phần nhân đôi là hiệu ứng booster nằm ở dòng
  // "Điều chỉnh FIFA" — nên KHÔNG nhân đôi trên thẻ (xem luật trong RulesTab).
  const squadView = useMemo(() => {
    if (!squad) return squad;
    const isMaxCaptain = chip === "Maximum Captain";
    let starters = squad.starters || [];

    if (isMaxCaptain && starters.length) {
      let topIdx = 0;
      starters.forEach((p, i) => {
        if (Number(p.points || 0) > Number(starters[topIdx].points || 0)) topIdx = i;
      });
      starters = starters.map((p, i) => ({ ...p, isCaptain: i === topIdx, isVice: false }));
    }

    const withDisplay = (list) =>
      list.map((p) => {
        const raw = Number(p.points || 0);
        return { ...p, displayPoints: p.isCaptain && !isMaxCaptain ? raw * 2 : raw };
      });

    return { ...squad, starters: withDisplay(starters), bench: withDisplay(squad.bench || []) };
  }, [squad, chip]);

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
          <Pitch
            squad={squadView}
            infoMode={infoMode}
            onSelect={setSelected}
            twelfthMan={chip === "12th Man" ? squadView.twelfthMan : null}
          />
          <Bench squad={squadView} infoMode={infoMode} onSelect={setSelected} />
          {selected && <PlayerStatsModal p={selected} onClose={() => setSelected(null)} />}
        </>
      ) : (
        <div className="p-10 text-center text-on-surface-variant">Chưa có đội hình cho người chơi này.</div>
      )}
    </div>
  );
}
