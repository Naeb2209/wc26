"use client";

import { useMemo, useState } from "react";

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

function PlayerCard({ p, compact, infoMode = "opp" }) {
  const size = compact ? "w-28 h-28" : "w-32 h-32";
  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border-2 backdrop-blur-[1px] px-1.5 pt-2 pb-1.5 ${
        p.isCaptain
          ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_14px_rgba(250,204,21,0.55)]"
          : "border-white/15 bg-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
      } ${compact ? "w-[124px]" : "w-[150px]"}`}
    >
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
            title="Điểm"
            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 border border-yellow-400/70 text-[12px] font-data-mono font-bold leading-none text-yellow-400 shadow"
          >
            {p.points}<span className="text-[9px] ml-0.5">pts</span>
          </span>
        </div>
        <img
          src={p.avatar || "/players/_placeholder.svg"}
          alt=""
          className={`relative object-contain ${p.avatar ? "w-full h-full" : "w-2/3 h-2/3 opacity-80"}`}
          style={
            p.avatar
              ? {
                  maskImage: "linear-gradient(to bottom, #000 62%, transparent 96%)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 96%)",
                  filter:
                    "drop-shadow(0 3px 5px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.45))",
                }
              : undefined
          }
          onError={(e) => {
            if (e.currentTarget.src.indexOf("_placeholder.svg") === -1) {
              e.currentTarget.src = "/players/_placeholder.svg";
            }
          }}
        />
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

function Pitch({ squad, infoMode }) {
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

      <div className="relative space-y-5 sm:space-y-7">
        {ROWS.map((r) => (
          <div key={r.bucket} className="flex justify-center gap-2 sm:gap-4 flex-wrap">
            {(byBucket[r.bucket] || []).map((p) => (
              <PlayerCard key={`${p.teamCode}:${p.name}`} p={p} infoMode={infoMode} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bench({ squad, infoMode }) {
  return (
    <div className="mt-4 bg-surface-container-low border border-outline-variant rounded-xl p-3">
      <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">event_seat</span>
        Ghế dự bị (Bench)
      </div>
      <div className="flex justify-around gap-2 flex-wrap rounded-lg py-3" style={{ background: "linear-gradient(180deg,#27324a,#1b2336)" }}>
        {squad.bench.map((p) => (
          <PlayerCard key={`${p.teamCode}:${p.name}`} p={p} compact infoMode={infoMode} />
        ))}
      </div>
    </div>
  );
}

// Panel đội hình (bên phải bảng xếp hạng Round). Nhận manager đang chọn + squad của họ.
export function ManagerLineup({ manager, squad, points, chip, chipIcon }) {
  const [infoMode, setInfoMode] = useState("opp");
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
          <Pitch squad={squad} infoMode={infoMode} />
          <Bench squad={squad} infoMode={infoMode} />
        </>
      ) : (
        <div className="p-10 text-center text-on-surface-variant">Chưa có đội hình cho người chơi này.</div>
      )}
    </div>
  );
}
