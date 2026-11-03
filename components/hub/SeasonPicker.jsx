import Link from "next/link";

/* Bộ chọn mùa của một giải nhiều mùa (vd TMA Futsal League: 2025, 2026).
   Mỗi mùa là một trang riêng nên pill chỉ là link — mùa đang xem không phải link, tô mực đặc.
   Dùng ở hai chỗ với hai kích cỡ: `size="sm"` cho thẻ giải, mặc định cho trang chi tiết. */

export default function SeasonPicker({ seasons, current, sportSlug, size, className = "" }) {
  if (!seasons || seasons.length < 2) return null;

  const sm = size === "sm";
  const pill = sm
    ? "rounded-full border px-2.5 py-1 font-dc-display text-[10.5px] font-bold uppercase tracking-[0.1em]"
    : "rounded-full border px-3.5 py-1.5 font-dc-display text-[11.5px] font-bold uppercase tracking-[0.1em]";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span
        className={`font-dc-display font-bold uppercase tracking-[0.16em] text-dc-ink-2 ${
          sm ? "text-[9.5px]" : "text-[10px]"
        }`}
      >
        Mùa giải
      </span>

      {seasons.map((s) => {
        const on = s.slug === current;
        return on ? (
          <span key={s.slug} aria-current="page" className={`${pill} border-dc-ink bg-dc-ink text-white`}>
            {s.season}
          </span>
        ) : (
          <Link
            key={s.slug}
            href={`/the-thao/${sportSlug}/giai-dau/${s.slug}`}
            className={`${pill} border-dc-line bg-white text-dc-ink-2 transition-colors hover:border-dc-gold hover:text-dc-gold`}
          >
            {s.season}
          </Link>
        );
      })}
    </div>
  );
}
