import Link from "next/link";
import { eventsByYear, fmtDate, fmtTime, mediaFor, relativeDay, weekdayOf } from "@/lib/dc42";
import { Card, Chip, MediaTile, PageHeader, Section, StatusChip } from "@/components/hub/ui";
import { eventTheme, themeVars } from "@/lib/eventThemes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sự kiện | DC42 Hub",
  description: "Ngày đặc biệt của DC: Noel, 8/3, sinh nhật DC, trip, teambuilding — thông báo trước và album sau.",
};

export default async function EventsPage({ searchParams }) {
  const sq = (await searchParams) || {};
  const type = sq.loai || "all";

  const allYears = eventsByYear();
  const flat = allYears.flatMap(([, list]) => list);
  const types = [...new Set(flat.map((e) => e.type))];
  const upcoming = flat.filter((e) => e.status === "upcoming");

  // Bộ lọc chỉ áp cho dòng thời gian; khối "sắp diễn ra" luôn hiện đủ.
  const years = allYears
    .map(([year, list]) => [year, type === "all" ? list : list.filter((e) => e.type === type)])
    .filter(([, list]) => list.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Sự kiện DC"
        title="Ngày đặc biệt của DC"
        lede="Phần không phải thể thao: Noel, 8/3, sinh nhật DC, trip và teambuilding. Trước sự kiện là thông báo và chương trình, sau sự kiện là album."
      />

      {upcoming.length > 0 && (
        <Section title="Sắp diễn ra">
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((e) => {
              const theme = eventTheme(e);
              return (
              <Card
                key={e.slug}
                href={`/su-kien/${e.slug}`}
                className="flex flex-col gap-3 p-6"
                style={{ ...themeVars(theme), borderColor: "var(--ev-line)", background: "var(--ev-soft)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="social">{e.type}</Chip>
                  <StatusChip status={e.status} />
                  <Chip tone="gold">{relativeDay(e.date)}</Chip>
                </div>
                <p className="flex items-center gap-2 font-dc-display text-[24px] font-bold leading-tight text-dc-ink">
                  <span className="material-symbols-outlined text-[22px] text-[color:var(--ev-accent)]">{theme.icon}</span>
                  {e.name}
                </p>
                <p className="text-body-md text-dc-ink-2">{e.summary}</p>
                <p className="text-[13.5px] text-dc-ink">
                  {weekdayOf(e.date)}, {fmtDate(e.date)} · {fmtTime(e.date)} · {e.place}
                </p>
              </Card>
              );
            })}
          </div>
        </Section>
      )}

      <div className="border-t border-dc-line bg-dc-paper">
        <Section title="Dòng thời gian" hint="Xem lại từng năm.">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Loại</span>
            <TypeLink label="Tất cả" value="all" active={type === "all"} />
            {types.map((t) => (
              <TypeLink key={t} label={t} value={t} active={type === t} />
            ))}
          </div>

          <div className="flex flex-col gap-10">
            {years.map(([year, list]) => (
              <div key={year}>
                <h3 className="mb-4 font-dc-display text-[13px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">{year}</h3>
                <div className="flex flex-col gap-3">
                  {list.map((e) => {
                    const album = mediaFor(e.slug);
                    const theme = eventTheme(e);
                    return (
                      <Link
                        key={e.slug}
                        href={`/su-kien/${e.slug}`}
                        style={{ ...themeVars(theme), borderLeftColor: "var(--ev-accent)" }}
                        className="grid gap-4 rounded-2xl border border-dc-line border-l-4 bg-white p-5 transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center"
                      >
                        <div>
                          <p className="flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--ev-accent-deep)]">
                            <span className="material-symbols-outlined text-[15px]">{theme.icon}</span>
                            {e.type}
                          </p>
                          <p className="text-[13.5px] tabular-nums text-dc-ink-2">{fmtDate(e.date)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-dc-display text-[19px] font-bold leading-tight text-dc-ink">{e.name}</p>
                          <p className="mt-1 text-body-md text-dc-ink-2">{e.summary}</p>
                          <p className="mt-1 text-[13px] text-dc-ink-2">{e.place}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {album.length > 0 ? (
                            <Chip icon="photo_library">{album.length} ảnh</Chip>
                          ) : (
                            <Chip icon="photo_camera">Chưa có ảnh</Chip>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Ảnh nổi bật">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {years
            .flatMap(([, list]) => list)
            .flatMap((e) => mediaFor(e.slug).slice(0, 1))
            .map((m) => (
              <MediaTile key={m.id} item={m} />
            ))}
        </div>
      </Section>
    </>
  );
}

function TypeLink({ label, value, active }) {
  return (
    <Link
      href={value === "all" ? "/su-kien" : `/su-kien?loai=${encodeURIComponent(value)}`}
      className={`rounded-full border px-3.5 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
        active ? "border-dc-ink bg-dc-ink text-white" : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
      }`}
    >
      {label}
    </Link>
  );
}
