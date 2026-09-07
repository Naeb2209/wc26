import Link from "next/link";
import { fmtDate, memberName, podiumOf, venueById } from "@/lib/dc42";
import { Chip, StatusChip } from "./ui";

/* Thẻ một giải, dựng theo nhịp thẻ competition của EWC:
   đầu thẻ (chip đơn vị + trạng thái, tên giải, thể thức) -> khối podium nền xám, hàng đầu tô gold
   -> danh sách thông số label ↔ value kẻ mảnh -> nút CTA tràn ngang ở đáy.
   Thẻ không bọc trong <a> — CTA và tên giải là hai link riêng, tránh anchor lồng anchor. */

export default function TournamentCard({ tournament: t, sportSlug }) {
  const href = `/the-thao/${sportSlug}/giai-dau/${t.slug}`;
  const podium = podiumOf(t);
  const venue = venueById(t.venueId);
  const played = (t.matches || []).filter((m) => m.status === "done").length;

  // Giải của TMA có khi chỉ lưu đúng đội/cặp của DC (vd TMA Football Cup 2025 chỉ có t-dc42),
  // nên chỉ nói "N đội" khi thật sự lưu đủ các đội — còn lại nói số trận, không thì bỏ dòng.
  const scale = [
    t.teams?.length > 1 ? `${t.teams.length} đội` : null,
    t.entries?.length ? `${t.entries.length} cặp của DC` : null,
    played ? `${played} trận đã đá` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const specs = [
    { label: "Thời gian", value: `${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}`, nums: true },
    venue ? { label: "Sân", value: venue.name } : null,
    scale ? { label: "Quy mô", value: scale, nums: true } : null,
    t.topScorer
      ? {
          label: "Vua phá lưới",
          value: `${memberName(t.topScorer.memberId)} · ${t.topScorer.goals} bàn`,
        }
      : null,
  ].filter(Boolean);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-dc-line bg-white">
      <div className="flex flex-col gap-2.5 px-6 pb-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={t.host === "TMA" ? "neutral" : "gold"}>{t.host}</Chip>
          <StatusChip status={t.status} />
          <span className="ml-auto font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
            Mùa {t.season}
          </span>
        </div>

        <Link href={href} className="font-dc-display text-[21px] font-bold leading-tight text-dc-ink hover:text-dc-gold">
          {t.name}
        </Link>

        {t.format ? <p className="text-[13px] text-dc-ink-2">{t.format}</p> : null}
      </div>

      {podium ? <Podium podium={podium} /> : null}

      <dl className="flex flex-col px-6">
        {specs.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-4 border-t border-dc-line py-3">
            <dt className="shrink-0 font-dc-display text-[10.5px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
              {s.label}
            </dt>
            <dd className={`text-right text-[13.5px] text-dc-ink ${s.nums ? "tabular-nums" : ""}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto p-4 pt-3">
        <Link
          href={href}
          className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-dc-bone font-dc-display text-[12px] font-bold uppercase tracking-[0.14em] text-dc-ink transition-colors hover:bg-dc-ink hover:text-white"
        >
          Xem giải
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}

/* Khối podium: nền xám nhạt, hàng dẫn đầu tô gold mực trắng — đúng kiểu bảng Winners của EWC. */
function Podium({ podium }) {
  const grid = podium.ranked
    ? "grid-cols-[20px_minmax(0,1fr)_auto]"
    : "grid-cols-[minmax(0,1fr)_auto]";

  return (
    <div className="mx-6 mb-5 rounded-xl bg-dc-paper p-2">
      <p className="px-2 pb-1.5 pt-1 font-dc-display text-[9.5px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">
        {podium.label}
      </p>

      <div
        className={`grid ${grid} items-center gap-x-3 px-2 pb-1.5 font-dc-display text-[9.5px] font-bold uppercase tracking-[0.14em] text-dc-ink-2`}
      >
        {podium.ranked ? <span>#</span> : null}
        <span>{podium.cols[0]}</span>
        <span className="text-right">{podium.cols[1]}</span>
      </div>

      <ul className="flex flex-col gap-1">
        {podium.rows.map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className={`grid ${grid} items-center gap-x-3 rounded px-2 py-2 ${
              r.lead
                ? "bg-dc-gold text-white"
                : r.focus
                  ? "bg-dc-gold-soft text-dc-ink ring-1 ring-inset ring-dc-gold/35"
                  : "bg-white text-dc-ink"
            }`}
          >
            {podium.ranked ? (
              <span
                className={`font-dc-display text-[11px] font-bold tabular-nums ${
                  r.lead ? "text-dc-gold-soft" : "text-dc-ink-2"
                }`}
              >
                {r.rank}
              </span>
            ) : null}

            <span className="min-w-0">
              <span className="block truncate font-dc-display text-[13.5px] font-bold">{r.name}</span>
              {r.sub || r.note ? (
                <span className={`block text-[11.5px] tabular-nums ${r.lead ? "text-white/75" : "text-dc-ink-2"}`}>
                  {[r.sub, r.note].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </span>

            <span className="text-right font-dc-display text-[12px] font-bold uppercase tracking-[0.06em] tabular-nums">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
