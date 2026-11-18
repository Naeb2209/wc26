"use client";

import { useState } from "react";
import { Chip, EmptyState } from "./ui";

/* Danh sách trận của một giải. Dòng trận đã được trang dựng sẵn thành chữ (tên đội, tên người ghi bàn)
   nên component này không cần đụng tới dc42.json — khối dữ liệu đó mà lọt xuống trình duyệt thì nặng.
   Giải nào DC góp nhiều hơn một đội thì có thêm hàng pill lọc theo đội; một đội thì không hiện gì. */

export default function MatchTimeline({ items, teams = [] }) {
  const [only, setOnly] = useState("all");
  const many = teams.length > 1;
  const list = many && only !== "all" ? items.filter((m) => m.teams.includes(only)) : items;

  if (items.length === 0) {
    return <EmptyState icon="history" title="Mùa này không lưu chi tiết từng trận" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {many ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-0.5 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">
            Đội
          </span>
          {[{ id: "all", name: "Cả hai" }, ...teams].map((t) => {
            const on = t.id === only;
            const n = t.id === "all" ? items.length : items.filter((m) => m.teams.includes(t.id)).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setOnly(t.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  on
                    ? "border-dc-ink bg-dc-ink text-white"
                    : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
                }`}
              >
                {t.name}
                <span className={`ml-1.5 tabular-nums ${on ? "text-white/60" : "text-dc-ink-2/70"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {list.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-dc-line bg-white px-5 py-4"
          >
            <div className="w-[86px] shrink-0">
              <p
                className={`font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] ${
                  m.done ? "text-dc-ink-2" : "text-dc-gold"
                }`}
              >
                {m.lead}
              </p>
              <p className="text-[13px] tabular-nums text-dc-ink-2">{m.when}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-dc-display text-[15.5px] font-bold text-dc-ink">
                {m.home}{" "}
                <span className={m.done ? "text-dc-gold" : "text-dc-ink-2"}>{m.score}</span> {m.away}
              </p>
              {m.goals.length ? (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-dc-ink-2">
                  {m.goals.map((g, gi) => (
                    <span key={`${m.id}-${g.id}`} className="inline-flex items-center gap-1">
                      {gi > 0 ? <span className="text-dc-line">·</span> : null}
                      {g.name}
                      {/* Mỗi bàn một quả bóng, thay cho ×2 / ×3. */}
                      <span className="inline-flex items-center text-dc-gold" title={`${g.n} bàn`}>
                        {Array.from({ length: g.n }).map((_, k) => (
                          <span key={k} className="material-symbols-outlined text-[14px] leading-none">
                            sports_soccer
                          </span>
                        ))}
                      </span>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
            {m.done ? null : <Chip tone="gold">Chưa đá</Chip>}
          </li>
        ))}
      </ul>
    </div>
  );
}
