import Link from "next/link";
import {
  fmtDate,
  fmtTime,
  getHub,
  media,
  posts,
  recentResults,
  relativeDay,
  sportSlug,
  tournaments,
  upcomingFeed,
  weekdayOf,
} from "@/lib/dc42";
import { Card, Chip, Eyebrow, MediaTile, Section, SportChip, StatusChip } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

const KIND_ICON = { session: "groups", event: "celebration", match: "sports_soccer" };

export default function HomePage() {
  const hub = getHub();
  const feed = upcomingFeed(7);
  const next = feed[0];
  const results = recentResults(4);
  const running = tournaments().filter((t) => t.status === "running");
  const pinned = posts().filter((p) => p.pinned).slice(0, 2);
  const latestMedia = [...media()].slice(0, 6);

  return (
    <>
      {/* Hero: hoạt động gần nhất */}
      <header className="border-b border-dc-line bg-dc-ink text-white">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop md:py-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-dc-display text-[11px] font-bold uppercase tracking-[0.22em] text-dc-gold">
                {hub.org.tagline}
              </p>
              <h1 className="mt-3 font-dc-display text-[38px] font-bold italic leading-[0.98] tracking-tight md:text-[62px]">
                Tuần này DC có gì
              </h1>
              <p className="mt-4 max-w-[58ch] text-body-lg text-white/70">
                Kèo giao lưu, giải đang đá, sự kiện sắp tới và toàn bộ ảnh cũ — gom về một chỗ thay vì trôi trong chat.
              </p>
            </div>

            {next && (
              <Link
                href={next.href}
                className="group w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-6 transition-colors hover:border-dc-gold/60 hover:bg-white/10"
              >
                <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.18em] text-dc-gold">
                  Gần nhất · {relativeDay(next.at)}
                </p>
                <p className="mt-2 font-dc-display text-[24px] font-bold leading-tight">{next.title}</p>
                <p className="mt-1 text-body-md text-white/70">
                  {weekdayOf(next.at)}, {fmtDate(next.at)}
                  {fmtTime(next.at) ? ` · ${fmtTime(next.at)}` : ""}
                  {next.place ? ` · ${next.place}` : ""}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  Xem chi tiết
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Thông báo ghim */}
      {pinned.length > 0 && (
        <div className="border-b border-dc-line bg-dc-gold-soft">
          <div className="mx-auto flex w-full max-w-container-max flex-col gap-3 px-margin-mobile py-4 md:flex-row md:items-center md:gap-6 md:px-margin-desktop">
            <span className="inline-flex shrink-0 items-center gap-1.5 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              Thông báo
            </span>
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-6">
              {pinned.map((p) => (
                <Link key={p.slug} href={`/bang-tin/${p.slug}`} className="text-body-md text-dc-ink hover:text-dc-gold">
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sắp diễn ra */}
      <Section
        title="Sắp diễn ra"
        hint="Giao lưu, giải đấu và sự kiện trong bốn tuần tới."
        action={
          <Link href="/the-thao" className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold">
            Vào tab Thể thao →
          </Link>
        }
      >
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {feed.map((item, i) => (
            <li key={`${item.href}-${i}`}>
              <Card href={item.href} className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
                    <span className="material-symbols-outlined text-[18px] text-dc-gold">{KIND_ICON[item.kind]}</span>
                    {relativeDay(item.at)}
                  </span>
                  {item.sport ? <SportChip sport={item.sport} /> : <Chip tone="social">{item.meta}</Chip>}
                </div>
                <p className="font-dc-display text-[17px] font-bold leading-snug text-dc-ink">{item.title}</p>
                <p className="mt-auto text-[13.5px] text-dc-ink-2">
                  {weekdayOf(item.at)}, {fmtDate(item.at)}
                  {fmtTime(item.at) ? ` · ${fmtTime(item.at)}` : ""}
                  {item.place ? <span className="block">{item.place}</span> : null}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Giải đang chạy + kết quả */}
      <div className="border-y border-dc-line bg-dc-paper">
        <Section title="Đang diễn ra" hint="Giải của DC và giải TMA mà DC đang tham gia.">
          <div className="grid gap-4 lg:grid-cols-3">
            {running.map((t) => (
              <Card key={t.slug} href={`/the-thao/${sportSlug(t.sport)}/giai-dau/${t.slug}`} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <SportChip sport={t.sport} />
                  <Chip tone={t.host === "TMA" ? "neutral" : "gold"}>{t.host}</Chip>
                  <StatusChip status={t.status} />
                </div>
                <p className="font-dc-display text-[19px] font-bold leading-tight text-dc-ink">{t.name}</p>
                <p className="text-[13.5px] text-dc-ink-2">{t.format}</p>
                <p className="text-[13px] text-dc-ink-2">
                  {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                </p>
              </Card>
            ))}

            <Card className="flex flex-col gap-3 p-5">
              <Eyebrow>Kết quả mới nhất</Eyebrow>
              <ul className="flex flex-col divide-y divide-dc-line">
                {results.map((r, i) => (
                  <li key={i} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                    <span className="font-dc-display text-[15px] font-bold text-dc-ink">{r.label}</span>
                    <span className="text-[12.5px] text-dc-ink-2">
                      {r.tournament}
                      {r.round ? ` · ${r.round}` : ""} · {fmtDate(r.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Section>
      </div>

      {/* Moments mới nhất */}
      <Section
        title="Moments mới nhất"
        hint="Ảnh và video anh em góp từ các hoạt động gần đây."
        action={
          <Link href="/moments" className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold">
            Vào kho ảnh →
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {latestMedia.map((m) => (
            <MediaTile key={m.id} item={m} />
          ))}
        </div>
      </Section>
    </>
  );
}
