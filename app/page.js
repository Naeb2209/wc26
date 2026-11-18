import Link from "next/link";
import {
  albums,
  fmtDate,
  fmtTime,
  getHub,
  media,
  memberName,
  posts,
  predictionLeagues,
  relativeDay,
  sportSlug,
  tournaments,
  upcomingFeed,
  weekdayOf,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, LeagueLogo, Section, SportChip, StatusChip } from "@/components/hub/ui";
import MomentsRail from "@/components/hub/MomentsRail";

export const dynamic = "force-dynamic";

const KIND_ICON = { session: "groups", event: "celebration", match: "sports_soccer" };

export default function HomePage() {
  const hub = getHub();
  const feed = upcomingFeed(7);
  const next = feed[0];
  const running = tournaments().filter((t) => t.status === "running");
  // Mùa Fantasy cũng là thứ đang chạy của DC: không gom vào đây thì có lúc giải đấu
  // nghỉ hết mà mục "Đang diễn ra" vẫn trống trong khi mùa FPL đang đá giữa chừng.
  const runningFantasy = predictionLeagues().flatMap((l) =>
    (l.seasons || []).filter((s) => s.status === "running").map((s) => ({ league: l, season: s }))
  );
  const pinned = posts().filter((p) => p.pinned).slice(0, 2);
  // Dải Moments là thành phần client -> dọn sẵn phía server, chỉ đưa qua đúng mấy trường
  // cần vẽ, không ném cả data vào bundle.
  const albumOf = new Map(albums().map((a) => [a.activity, a]));
  // Lấy tối đa 2 ảnh mỗi hoạt động rồi trải đều: một album 16 ảnh mà chiếm cả dải thì
  // trang chủ chỉ kể được đúng một buổi. Hoạt động mới nhất đứng trước.
  const pool = new Map();
  for (const m of media().filter((m) => m.url || m.type === "video")) {
    if (!pool.has(m.activity)) pool.set(m.activity, []);
    pool.get(m.activity).push(m);
  }
  const order = [...pool.keys()].sort((a, b) =>
    String(albumOf.get(b)?.date || "").localeCompare(String(albumOf.get(a)?.date || ""))
  );
  const picked = [];
  for (const round of [0, 1]) for (const key of order) {
    const item = pool.get(key)[round];
    if (item) picked.push(item);
  }
  // `pin` đặt mục vào đúng chỗ trong dải: `true` là ô đầu, số là ô thứ mấy (1 = đầu).
  // Cần cái này vì dải xếp theo ngày hoạt động, muốn khoe một tấm cũ mà không có pin thì
  // chỉ còn cách bịa lại ngày của cả album.
  const pinOf = (m) => (m.pin === true ? 1 : Number.isFinite(m.pin) ? m.pin : null);
  const loose = picked.filter((m) => pinOf(m) === null);
  for (const m of picked.filter((m) => pinOf(m) !== null).sort((a, b) => pinOf(a) - pinOf(b))) {
    loose.splice(Math.max(0, pinOf(m) - 1), 0, m);
  }

  const moments = loose.slice(0, 12).map((m) => {
    const a = albumOf.get(m.activity);
    return {
      id: m.id,
      url: m.url || null,
      type: m.type,
      caption: m.caption || "",
      by: m.by ? memberName(m.by) : "",
      activity: a?.title || "DC42",
      href: a?.href || "/moments",
      tone: m.tone || 1,
      focus: m.focus || null,
    };
  });

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
        hint="Buổi giao lưu gần nhất của mỗi môn, cùng giải đấu và sự kiện trong bốn tuần tới."
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

      <div className="border-y border-dc-line bg-dc-paper">
        {/* Moments: dải cuộn ngang, cột xen kẽ dọc / ngang / cột đôi. Ảnh phủ kín ô,
            người đăng và hoạt động nằm trên dải tối ở đáy — xem Moments là xem ảnh chứ
            không phải đọc một bảng danh sách. */}
        <Section
          title="DC Moments"
          hint="Sống lại các buổi của DC qua ảnh anh em chụp. Vuốt ngang để xem tiếp, bấm vào ảnh là tới album của hoạt động đó."
          action={
            <Link href="/moments" className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold">
              Vào kho ảnh →
            </Link>
          }
        >
          <MomentsRail items={moments} />
        </Section>
      </div>

      {/* Giải và mùa Fantasy đang chạy */}
      <Section title="Đang diễn ra" hint="Giải của DC, giải TMA mà DC đang tham gia và mùa Fantasy đang chạy.">
        {running.length + runningFantasy.length === 0 ? (
          <EmptyState icon="hourglass_empty" title="Không có giải nào đang chạy" hint="Giải mới sẽ hiện ở đây." />
        ) : null}
        {/* Thẻ đứng một mình thì ghìm bề ngang lại, không kéo dài hết lưới ba cột. */}
        <div
          className={`grid gap-4 ${running.length + runningFantasy.length > 1 ? "lg:grid-cols-3" : "max-w-card-max"}`}
        >
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

          {runningFantasy.map(({ league, season }) => (
            <Card
              key={`${league.slug}-${season.id}`}
              href={`/the-thao/${sportSlug(league.sport)}/fantasy#${league.slug}`}
              className="flex flex-col gap-3 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SportChip sport={league.sport} />
                <Chip tone="fantasy" icon="stadium">
                  {league.kind}
                </Chip>
                <StatusChip status="running" />
              </div>
              <div className="flex items-center gap-3">
                <LeagueLogo league={league} />
                <p className="font-dc-display text-[19px] font-bold leading-tight text-dc-ink">{league.name}</p>
              </div>
              <p className="text-[13.5px] text-dc-ink-2">Mùa {season.label}</p>
              <p className="text-[13px] text-dc-ink-2">Bảng điểm và mini game nằm ở tab Fantasy.</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
