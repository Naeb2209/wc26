"use client";

import { useState } from "react";
import { flagUrl } from "@/lib/flags";

function Pitch({ match }) {
  if (!match) {
    return (
      <div className="text-center text-on-surface-variant py-16 font-body-md">
        Chọn một trận có nút <span className="font-bold text-primary">“Dự Đoán Đội Hình”</span> để xem sơ đồ ra sân.
      </div>
    );
  }
  if (!match.lineup) {
    return (
      <div className="text-center text-on-surface-variant py-16 font-body-md">
        Chưa có dự đoán đội hình cho trận {match.homeCode} vs {match.awayCode}.
      </div>
    );
  }
  const { home, away } = match.lineup;
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface">Đội Hình Dự Kiến</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 font-label-caps text-label-caps">
            <span className="w-3 h-3 rounded-full bg-secondary-container inline-block" /> {match.homeCode}
          </div>
          <div className="flex items-center gap-1 font-label-caps text-label-caps">
            <span className="w-3 h-3 rounded-full bg-error-container inline-block border border-error" /> {match.awayCode}
          </div>
        </div>
      </div>
      <div className="stadium-bg w-full aspect-[2/3] md:aspect-[3/4] rounded-lg overflow-hidden relative">
        <div className="stadium-lines" />
        <div className="center-circle" />
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[rgba(255,255,255,0.2)] -translate-y-1/2" />
        {home.players.map((p, i) => (
          <div key={`a${i}`} className="player-dot team-a" style={{ top: `${p.top}%`, left: `${p.left}%` }}>
            <span className="player-name-tag">{p.name}</span>
          </div>
        ))}
        {away.players.map((p, i) => (
          <div key={`b${i}`} className="player-dot team-b" style={{ top: `${p.top}%`, left: `${p.left}%` }}>
            <span className="player-name-tag">{p.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between font-label-caps text-label-caps text-on-surface-variant">
        <span>Sơ đồ {match.homeCode}: {home.formation}</span>
        <span>Sơ đồ {match.awayCode}: {away.formation}</span>
      </div>
      {match.note && (
        <div className="mt-4 p-4 bg-surface-container-low rounded-lg border border-surface-variant">
          <div className="font-data-mono text-data-mono text-on-surface mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span> Nhận định
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">{match.note}</p>
        </div>
      )}
    </>
  );
}

export default function ScheduleView({ stages, schedule }) {
  const [stage, setStage] = useState("Vòng Bảng");
  const groupData = schedule["Vòng Bảng"];
  const [round, setRound] = useState(groupData.rounds[0]);
  const matches = stage === "Vòng Bảng" ? groupData.matches[round] || [] : [];
  const [selected, setSelected] = useState(matches.find((m) => m.lineup) || matches[0] || null);

  const pickRound = (r) => {
    setRound(r);
    const ms = groupData.matches[r] || [];
    setSelected(ms.find((m) => m.lineup) || ms[0] || null);
  };

  return (
    <>
      {/* Stage tabs */}
      <div className="flex overflow-x-auto pb-4 mb-12 border-b border-surface-variant hide-scrollbar gap-8">
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={
              s === stage
                ? "font-headline-md text-headline-md text-primary border-b-4 border-primary pb-2 whitespace-nowrap px-4"
                : "font-headline-md text-headline-md text-on-surface-variant hover:text-primary transition-colors pb-2 whitespace-nowrap px-4 opacity-60"
            }
          >
            {s}
          </button>
        ))}
      </div>

      {stage === "Vòng Bảng" ? (
        <>
          {/* Round sub-tabs */}
          <div className="flex gap-4 mb-8">
            {groupData.rounds.map((r) => (
              <button
                key={r}
                onClick={() => pickRound(r)}
                className={
                  r === round
                    ? "bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-full"
                    : "bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-low font-label-caps text-label-caps px-4 py-2 rounded-full transition-colors"
                }
              >
                {r}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {/* Match list */}
            <div className="md:col-span-7 flex flex-col gap-6">
              {matches.length === 0 && (
                <div className="bg-surface border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                  Chưa có trận đấu cho {round}.
                </div>
              )}
              {matches.map((m) => {
                const active = selected && selected.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`match-card bg-surface rounded-xl p-6 relative overflow-hidden cursor-pointer ${
                      active ? "!border-primary shadow-[0_8px_24px_rgba(29,78,216,0.12)]" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="font-label-caps text-label-caps text-primary bg-primary-fixed px-3 py-1 rounded-full inline-block">
                        {m.group} • {round}
                      </div>
                      <div className="text-right">
                        <div className="font-data-mono text-data-mono text-on-surface">{m.date}</div>
                        <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center justify-end gap-1 mt-1">
                          <span className="material-symbols-outlined text-[14px]">stadium</span> {m.venue}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between my-6">
                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-secondary-container overflow-hidden flex items-center justify-center">
                          <img src={m.homeFlag || flagUrl(m.homeIso, 160)} alt={m.homeCode} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-headline-md text-headline-md text-on-surface">{m.homeCode}</span>
                      </div>
                      <div className="flex flex-col items-center w-1/3">
                        <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface-variant opacity-20">VS</span>
                        <span className="font-data-mono text-data-mono text-primary mt-2">{m.time}</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-outline-variant overflow-hidden flex items-center justify-center">
                          <img src={m.awayFlag || flagUrl(m.awayIso, 160)} alt={m.awayCode} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-headline-md text-headline-md text-on-surface">{m.awayCode}</span>
                      </div>
                    </div>
                    {m.channel && (
                      <div className="flex justify-center mb-3">
                        <span className="inline-flex items-center gap-1 bg-error/10 text-error font-label-caps text-label-caps uppercase px-3 py-1 rounded-full">
                          <span className="material-symbols-outlined text-[14px]">live_tv</span>
                          Trực tiếp: {m.channel}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center mt-4">
                      <span
                        className={
                          active
                            ? "bg-primary text-on-primary font-label-caps text-label-caps uppercase px-6 py-3 rounded-full flex items-center gap-2"
                            : "bg-transparent text-primary border-2 border-primary font-label-caps text-label-caps uppercase px-6 py-2.5 rounded-full flex items-center gap-2"
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]">strategy</span>
                        {m.lineup ? "Dự Đoán Đội Hình" : "Xem Đội Hình"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formation panel */}
            <div className="md:col-span-5 h-full">
              <div className="sticky top-28 bg-surface-container-low/70 backdrop-blur rounded-2xl p-6 shadow-xl border border-surface-variant">
                <Pitch match={selected} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">emoji_events</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{stage}</h3>
          <p className="font-body-md text-on-surface-variant max-w-md mx-auto">
            Lịch vòng loại trực tiếp sẽ được cập nhật sau khi kết thúc vòng bảng. Các cặp đấu phụ thuộc vào thứ hạng cuối cùng của mỗi bảng.
          </p>
        </div>
      )}
    </>
  );
}
