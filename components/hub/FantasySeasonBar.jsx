"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { predictionLeagues } from "@/lib/dc42";

/* Bộ chọn mùa cho trang bảng điểm Fantasy.
   Gom mọi mùa của mọi giải Fantasy vào một select (nhóm theo giải), mùa nào chưa có bảng điểm
   thì để disabled kèm ghi chú — chọn mùa có bảng điểm thì điều hướng sang trang đó. */

export default function FantasySeasonBar({ current }) {
  const router = useRouter();
  const leagues = predictionLeagues().filter((l) => l.kind === "Fantasy");

  const value = current ? `${current.league}:${current.season}` : "";
  const hrefOf = new Map();
  for (const l of leagues) {
    for (const s of l.seasons || []) hrefOf.set(`${l.slug}:${s.id}`, s.href);
  }

  const onChange = (e) => {
    const href = hrefOf.get(e.target.value);
    if (href) router.push(href);
  };

  const playable = [...hrefOf.values()].filter(Boolean).length;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-dc-line bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Mùa giải</p>
        <p className="mt-0.5 text-[13.5px] text-dc-ink-2">
          {playable > 1
            ? "Chọn mùa để xem bảng điểm tương ứng."
            : "Các mùa khác chưa có bảng điểm trên web — xem trạng thái ở trang Fantasy."}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={onChange}
          aria-label="Chọn mùa giải Fantasy"
          className="min-w-0 rounded-xl border border-dc-line bg-white px-3 py-2.5 font-dc-display text-[12px] font-bold uppercase tracking-[0.06em] text-dc-ink focus:border-dc-gold focus:outline-none md:w-72"
        >
          {leagues.map((l) => (
            <optgroup key={l.slug} label={l.name}>
              {(l.seasons || []).map((s) => (
                <option key={s.id} value={`${l.slug}:${s.id}`} disabled={!s.href}>
                  {s.season}
                  {s.href ? "" : " · chưa có bảng điểm"}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <Link
          href="/the-thao/bong-da/fantasy"
          title="Tất cả giải Fantasy"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-dc-line px-3 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink"
        >
          <span className="material-symbols-outlined text-[16px]">apps</span>
          Tất cả
        </Link>
      </div>
    </div>
  );
}
