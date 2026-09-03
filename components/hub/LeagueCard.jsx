"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, StatusChip } from "./ui";

/* Thẻ một giải dự đoán / Fantasy, gom nhiều mùa vào một chỗ.
   Nhiều mùa -> hàng pill chọn mùa (26/27, 25/26, 24/25…); một mùa -> chỉ hiện nhãn mùa. */

export default function LeagueCard({ league, defaultSeasonId, tone = "fantasy", icon = "stadium" }) {
  const seasons = league.seasons || [];
  const [seasonId, setSeasonId] = useState(defaultSeasonId || seasons[0]?.id);
  const season = seasons.find((s) => s.id === seasonId) || seasons[0] || {};
  const many = seasons.length > 1;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-dc-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-dc-line px-6 pb-4 pt-5">
        <Chip tone={tone} icon={icon}>
          {league.kind}
        </Chip>
        <p className="font-dc-display text-[21px] font-bold leading-tight text-dc-ink">{league.name}</p>
        <span className="ml-auto font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
          {seasons.length} mùa
        </span>
      </div>

      {/* Chọn mùa */}
      <div className="flex flex-wrap items-center gap-2 border-b border-dc-line bg-dc-paper px-6 py-3">
        <span className="mr-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Mùa</span>
        {many ? (
          seasons.map((s) => {
            const on = s.id === season.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeasonId(s.id)}
                aria-pressed={on}
                title={s.season}
                className={`rounded-full border px-3 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums transition-colors ${
                  on
                    ? "border-dc-ink bg-dc-ink text-white"
                    : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
                }`}
              >
                {s.label}
                {s.status === "running" ? <span className="ml-1.5 text-dc-gold">●</span> : null}
              </button>
            );
          })
        ) : (
          <span className="font-dc-display text-[12px] font-bold uppercase tracking-[0.08em] text-dc-ink tabular-nums">
            {season.season}
          </span>
        )}
      </div>

      {/* Mùa đang chọn */}
      <div className="flex flex-1 flex-col gap-3 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={season.status} />
          {season.champion ? <Chip tone="gold" icon="emoji_events">{season.champion}</Chip> : null}
        </div>

        <p className="text-body-md text-dc-ink-2">{season.note || league.note}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-dc-line pt-3">
          <span className="text-[13px] text-dc-ink-2 tabular-nums">
            {season.players ? `${season.players} người chơi` : "Chưa chốt danh sách"}
          </span>
          {season.href ? (
            <Link
              href={season.href}
              className="inline-flex items-center gap-1.5 rounded-full bg-dc-ink px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white"
            >
              Mở bảng điểm
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dc-line px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              Chưa có bảng điểm
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
