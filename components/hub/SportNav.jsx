import Link from "next/link";
import { sportMeta } from "./ui";

/* Thanh điều hướng con trong một môn.
   Theo ngôn ngữ của EWC: nhãn 12px/700 in hoa giãn 12%, khối segmented nền xám nhạt (#ededed),
   mục đang xem là pill mực đặc. Bên trái là breadcrumb "về hub + tên môn", ngăn bằng vạch dọc.
   Bar dính trên đầu để cuộn dài vẫn biết đang ở đâu. */

export default function SportNav({ sport, active }) {
  const meta = sportMeta(sport.id);
  const base = `/the-thao/${sport.slug}`;

  const tabs = [
    { key: "overview", href: base, label: "Tổng quan", icon: "dashboard" },
    { key: "sessions", href: `${base}/giao-luu`, label: "Giao lưu", icon: "groups" },
    { key: "tournaments", href: `${base}/giai-dau`, label: "Giải đấu", icon: "emoji_events" },
  ];
  if (sport.hasPrediction) {
    tabs.push({ key: "prediction", href: `${base}/du-doan`, label: "Fantasy", icon: "casino" });
  }

  return (
    <div className="sticky top-0 z-40 border-b border-dc-line bg-white/90 backdrop-blur-[10px]">
      <div className="mx-auto flex w-full max-w-container-max items-center gap-3 px-margin-mobile py-2.5 md:gap-5 md:px-margin-desktop">
        {/* Breadcrumb: về hub Thể thao + môn đang xem */}
        <Link
          href="/the-thao"
          className="group flex shrink-0 items-center gap-2 rounded-full py-1 pr-1 text-dc-ink-2 transition-colors hover:text-dc-ink"
          title="Tất cả các môn"
        >
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-0.5">
            arrow_back
          </span>
          <span className={`grid size-7 place-items-center rounded-lg ${meta.bg}`}>
            <span className={`material-symbols-outlined text-[17px] ${meta.text}`}>{sport.icon}</span>
          </span>
          <span className="hidden font-dc-display text-[12px] font-bold uppercase tracking-[0.12em] text-dc-ink sm:inline">
            {sport.name}
          </span>
        </Link>

        <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-dc-line sm:block" />

        {/* Segmented control */}
        <nav aria-label={`Mục trong ${sport.name}`} className="hide-scrollbar fade-right-mask -my-1 overflow-x-auto py-1">
          <div className="flex w-max gap-0.5 rounded-full bg-dc-bone p-1">
            {tabs.map((t) => {
              const on = t.key === active;
              return (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-dc-display text-[11.5px] font-bold uppercase tracking-[0.1em] transition-colors ${
                    on
                      ? "bg-dc-ink text-white shadow-[0_1px_3px_rgba(0,0,0,0.22)]"
                      : "text-dc-ink-2 hover:text-dc-ink"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${on ? "text-dc-gold-soft" : "text-dc-ink-2"}`}>
                    {t.icon}
                  </span>
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
