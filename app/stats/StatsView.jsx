"use client";

import { useState } from "react";

const COLLAPSED = 5;

function formatValue(value, dec) {
  if (value == null || Number.isNaN(Number(value))) return "–";
  const n = Number(value);
  return dec > 0 ? n.toFixed(dec) : String(Math.round(n));
}

function formatUpdated(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Row({ row, dec, unit, top }) {
  return (
    <li
      className={[
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        top ? "bg-tertiary-fixed/30 ring-1 ring-tertiary-fixed-dim" : "hover:bg-surface-container-low",
      ].join(" ")}
    >
      <span
        className={[
          "w-6 shrink-0 text-center font-data-mono text-data-mono",
          top ? "text-on-tertiary-fixed-variant font-bold" : "text-on-surface-variant",
        ].join(" ")}
      >
        {row.rank}
      </span>

      <span className="relative shrink-0">
        {row.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.avatar}
            alt={row.player}
            className="w-9 h-9 rounded-full object-cover bg-surface-container-high"
            loading="lazy"
            onError={(e) => {
              if (row.flag && e.currentTarget.src !== row.flag) e.currentTarget.src = row.flag;
            }}
          />
        ) : (
          <span className="grid place-items-center w-9 h-9 rounded-full bg-surface-container-high text-outline">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-body-md text-body-md text-on-background truncate leading-tight">
          {row.player}
        </span>
        <span className="flex items-center gap-1.5 text-on-surface-variant">
          {row.flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.flag} alt="" className="w-4 h-3 object-cover rounded-[2px]" loading="lazy" />
          )}
          <span className="font-label-caps text-label-caps uppercase truncate">{row.teamName}</span>
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span
          className={[
            "font-data-mono leading-none",
            top ? "text-[20px] text-primary font-bold" : "text-[16px] text-on-background",
          ].join(" ")}
        >
          {formatValue(row.value, dec)}
        </span>
        {unit ? <span className="block font-label-caps text-[10px] text-outline uppercase">{unit}</span> : null}
      </span>
    </li>
  );
}

function CategoryCard({ cat }) {
  const [open, setOpen] = useState(false);
  const rows = open ? cat.rows : cat.rows.slice(0, COLLAPSED);
  const extra = cat.rows.length - COLLAPSED;

  return (
    <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-outline-variant">
        <h3 className="font-headline-md text-[18px] leading-tight text-on-background">{cat.label}</h3>
        {cat.unit ? (
          <span className="font-label-caps text-label-caps uppercase text-secondary shrink-0">{cat.unit}</span>
        ) : null}
      </div>

      <ol className="p-2 flex flex-col gap-0.5">
        {rows.map((row, i) => (
          <Row key={`${row.player}-${row.rank}-${i}`} row={row} dec={cat.dec} unit={cat.unit} top={row.rank === 1} />
        ))}
      </ol>

      {extra > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-label-caps text-label-caps uppercase text-primary hover:bg-surface-container-low transition-colors py-2.5 border-t border-outline-variant"
        >
          {open ? "Thu gọn" : `Xem tất cả (${cat.rows.length})`}
        </button>
      )}
    </div>
  );
}

export default function StatsView({ stats }) {
  const groups = stats.groups || [];
  const [active, setActive] = useState(groups[0]?.key);
  const updated = formatUpdated(stats.updated);

  const current = groups.find((g) => g.key === active) || groups[0];

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
        {updated && (
          <span className="font-label-caps text-label-caps uppercase">Cập nhật: {updated}</span>
        )}
      </div>

      {/* Tab nhóm */}
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
              <span className="material-symbols-outlined text-[18px]">{g.icon || "leaderboard"}</span>
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Lưới hạng mục */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {(current?.categories || []).map((cat) => (
          <CategoryCard key={cat.name} cat={cat} />
        ))}
      </div>
    </div>
  );
}
