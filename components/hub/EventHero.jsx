import Link from "next/link";
import EventDecor from "@/components/hub/EventDecor";
import { themeVars } from "@/lib/eventThemes";

// Hero riêng cho trang sự kiện: cùng bố cục với PageHeader nhưng nền và màu chữ
// lấy từ theme của sự kiện, cộng thêm lớp trang trí phía sau.
export default function EventHero({ theme, event, meta, chips }) {
  return (
    <header
      className={`ev-hero ${theme.dark ? "ev-hero--dark" : ""}`}
      style={themeVars(theme)}
      data-event-theme={theme.key}
    >
      <EventDecor decor={theme.decor} />

      <div className="relative z-10 mx-auto w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop md:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--ev-hero-ink-2)]">
              <span className="material-symbols-outlined text-[16px]">{theme.icon}</span>
              <Link href="/su-kien" className="transition-opacity hover:opacity-70">
                Sự kiện DC
              </Link>
              <span aria-hidden="true">·</span>
              <span>{event.type}</span>
            </p>

            <h1 className="mt-3 font-dc-display text-[34px] font-bold italic leading-[1.02] tracking-tight text-[color:var(--ev-hero-ink)] md:text-[52px]">
              {event.name}
            </h1>

            {event.summary ? (
              <p className="mt-4 max-w-[62ch] text-body-lg text-[color:var(--ev-hero-ink-2)]">{event.summary}</p>
            ) : null}

            {meta ? (
              <p className="mt-5 text-[13.5px] font-medium text-[color:var(--ev-hero-ink-2)]">{meta}</p>
            ) : null}
          </div>

          {chips ? <div className="shrink-0">{chips}</div> : null}
        </div>
      </div>
    </header>
  );
}
