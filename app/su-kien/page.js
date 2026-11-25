import Link from "next/link";
import { coverOf, eventsByYear, fmtDate, fmtTime, heroImage, mediaFor, relativeDay, weekdayOf } from "@/lib/dc42";
import { MediaTile, PageHeader, Section } from "@/components/hub/ui";
import EventDecor from "@/components/hub/EventDecor";
import { eventTheme, themeVars } from "@/lib/eventThemes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sự kiện | DC42 Hub",
  description: "Ngày đặc biệt của DC: Noel, 8/3, sinh nhật DC, trip, teambuilding — thông báo trước và album sau.",
};

/* Dựng theo trang Fan Fest của EWC: mỗi sự kiện là một ô ảnh lớn bo tròn, tên và mô tả đè lên
   chân ảnh trên vệt tối. Sự kiện chưa có ảnh thì ô lấy màu + hoạ tiết theme của chính sự kiện
   (cùng bộ với hero trang chi tiết), nên lưới không bao giờ có ô trống. */

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
        hero
        image={heroImage((a) => a.kind !== "Giải đấu")}
        eyebrow="Sự kiện DC"
        title="Ngày đặc biệt của DC"
        lede="Phần không phải thể thao: Noel, 8/3, sinh nhật DC, trip và teambuilding. Trước sự kiện là thông báo và chương trình, sau sự kiện là album."
      />

      {upcoming.length > 0 && (
        <Section title="Sắp diễn ra" hint="Đăng ký, chương trình và chỗ hẹn nằm trong từng sự kiện.">
          <div className="grid gap-5 md:grid-cols-2">
            {upcoming.map((e) => (
              <EventTile key={e.slug} event={e} size="lg" />
            ))}
          </div>
        </Section>
      )}

      <div className="bg-[#f5f5f5]">
        <Section title="Dòng thời gian" hint="Xem lại từng năm — bấm vào ô để mở album.">
          <nav aria-label="Lọc theo loại sự kiện" className="hide-scrollbar -mx-1 mb-8 overflow-x-auto px-1 py-1">
            <div className="flex w-max gap-0.5 rounded-full bg-white p-1 shadow-[4px_8px_16px_rgba(0,0,0,0.06)]">
              <TypeLink label="Tất cả" value="all" active={type === "all"} />
              {types.map((t) => (
                <TypeLink key={t} label={t} value={t} active={type === t} />
              ))}
            </div>
          </nav>

          <div className="flex flex-col gap-12">
            {years.map(([year, list]) => (
              <div key={year}>
                <h3 className="mb-5 flex items-center gap-3 font-dc-display text-[22px] font-bold text-dc-ink md:text-[28px]">
                  {year}
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
                    {list.length} sự kiện
                  </span>
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((e) => (
                    <EventTile key={e.slug} event={e} />
                  ))}
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

/* Ô ảnh kiểu Fan Fest. size="lg" cho khối sắp diễn ra (chữ to, có tóm tắt + giờ giấc),
   mặc định là ô gọn cho dòng thời gian. */
function EventTile({ event: e, size = "md" }) {
  const theme = eventTheme(e);
  const cover = coverOf(e.slug);
  const photos = mediaFor(e.slug).length;
  const lg = size === "lg";
  // Chữ trên ô luôn trắng: theme nền sáng (mặc định, 8/3…) mà chưa có ảnh thì đổi sang nền mực ấm.
  const vars = themeVars(theme);
  if (!cover && !theme.dark) {
    vars["--ev-hero-from"] = "#1f1c18";
    vars["--ev-hero-to"] = "#3a3125";
  }

  return (
    <Link
      href={`/su-kien/${e.slug}`}
      style={vars}
      className={`ewc-tile group relative isolate flex flex-col justify-end overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,var(--ev-hero-from)_0%,var(--ev-hero-to)_100%)] text-white shadow-[0_12px_24px_rgba(0,0,0,0.06)] md:rounded-[32px] ${
        lg ? "min-h-[360px] md:aspect-[16/11] md:min-h-0" : "aspect-[4/3]"
      }`}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 -z-10 transition-transform duration-500 group-hover:scale-105">
          <EventDecor decor={theme.decor} />
        </div>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0)_70%)]"
      />

      <div className="absolute start-4 top-4 flex flex-wrap gap-1.5 md:start-5 md:top-5">
        <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] backdrop-blur-md">
          <span className="material-symbols-outlined text-[14px] text-[color:var(--ev-accent)]">{theme.icon}</span>
          {e.type}
        </span>
        {e.status === "upcoming" ? (
          <span className="ewc-chip !rounded-lg !px-2.5 !py-1 !text-[11px]">
            {/* relativeDay trả về đúng ngày khi đã xa — ngày đã nằm ở dòng dưới nên chip nói trạng thái. */}
            {relativeDay(e.date) === fmtDate(e.date) ? "Sắp diễn ra" : relativeDay(e.date)}
          </span>
        ) : photos > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] backdrop-blur-md">
            <span className="material-symbols-outlined text-[14px]">photo_library</span>
            {photos} ảnh
          </span>
        ) : null}
      </div>

      <div className={lg ? "p-6 md:p-8" : "p-5"}>
        <p className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
          {lg ? `${weekdayOf(e.date)}, ${fmtDate(e.date)} · ${fmtTime(e.date)}` : fmtDate(e.date)}
        </p>
        <p
          className={`mt-1.5 font-dc-display font-bold leading-[1.1] ${
            lg ? "text-[26px] md:text-[32px]" : "text-[20px]"
          }`}
        >
          {e.name}
        </p>
        {lg && e.summary ? (
          <p className="mt-2 line-clamp-2 max-w-[56ch] text-[14.5px] leading-snug text-white/80">{e.summary}</p>
        ) : null}
        <p className={`flex items-center gap-1 text-white/70 ${lg ? "mt-3 text-[13.5px]" : "mt-1 text-[13px]"}`}>
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          <span className="truncate">{e.place}</span>
        </p>
      </div>
    </Link>
  );
}

function TypeLink({ label, value, active }) {
  return (
    <Link
      href={value === "all" ? "/su-kien" : `/su-kien?loai=${encodeURIComponent(value)}`}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full px-4 py-2 font-dc-display text-[11.5px] font-bold uppercase tracking-[0.1em] transition-colors ${
        active ? "bg-dc-ink text-white" : "text-dc-ink-2 hover:text-dc-ink"
      }`}
    >
      {label}
    </Link>
  );
}
