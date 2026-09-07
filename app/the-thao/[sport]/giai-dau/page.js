import Link from "next/link";
import { notFound } from "next/navigation";
import { sportBySlug, sports, tournamentsOf } from "@/lib/dc42";
import { EmptyState, PageHeader, Section } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import TournamentCard from "@/components/hub/TournamentCard";

export const dynamic = "force-dynamic";

const ORDER = { running: 0, upcoming: 1, finished: 2 };

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "running", label: "Đang diễn ra" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "finished", label: "Đã kết thúc" },
];

const HOSTS = [
  { value: "all", label: "Tất cả" },
  { value: "DC", label: "DC" },
  { value: "TMA", label: "TMA" },
];

function hrefFor(sport, host, status) {
  const qs = new URLSearchParams();
  if (host !== "all") qs.set("don_vi", host);
  if (status !== "all") qs.set("trang_thai", status);
  const q = qs.toString();
  return `/the-thao/${sport}/giai-dau${q ? `?${q}` : ""}`;
}

export function generateStaticParams() {
  return sports().map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  return sp ? { title: `Giải ${sp.name.toLowerCase()} | DC42 Hub` } : {};
}

export default async function SportTournamentsPage({ params, searchParams }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  if (!sp) notFound();

  const sq = (await searchParams) || {};
  const host = HOSTS.some((h) => h.value === sq.don_vi) ? sq.don_vi : "all";
  const status = STATUS_TABS.some((s) => s.value === sq.trang_thai) ? sq.trang_thai : "all";

  const all = [...tournamentsOf(sp.id)].sort(
    (a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) || String(b.startDate).localeCompare(String(a.startDate))
  );
  const list = all.filter((t) => (host === "all" || t.host === host) && (status === "all" || t.status === status));
  const seasons = [...new Set(list.map((t) => t.season))].sort().reverse();

  // Số giải mỗi trạng thái, tính sau bộ lọc đơn vị -> con số trên tab luôn khớp thứ sẽ thấy.
  const inHost = all.filter((t) => host === "all" || t.host === host);
  const countOf = (value) => (value === "all" ? inHost.length : inHost.filter((t) => t.status === value).length);

  return (
    <>
      <SportNav sport={sp} active="tournaments" />

      <PageHeader
        eyebrow={`${sp.name} · Giải đấu`}
        title="Giải đấu trong năm"
        lede="Giải do DC tự tổ chức và giải do TMA tổ chức mà DC tham gia. Mỗi giải có lịch, kết quả, bảng xếp hạng và album riêng."
      />

      <Section>
        {/* Thanh lọc: trạng thái là tab gạch chân (nhịp EWC), đơn vị tổ chức là pill nhỏ bên phải. */}
        <div className="mb-7 border-b border-dc-line">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            {/* pr-6 để dải mờ của fade-right-mask rơi vào vùng trống, không ăn vào chữ tab cuối. */}
            <nav
              aria-label="Lọc theo trạng thái"
              className="hide-scrollbar fade-right-mask -mb-px flex max-w-full gap-6 overflow-x-auto pr-6"
            >
              {STATUS_TABS.map((tab) => {
                const on = tab.value === status;
                const n = countOf(tab.value);
                return (
                  <Link
                    key={tab.value}
                    href={hrefFor(sp.slug, host, tab.value)}
                    aria-current={on ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-3 font-dc-display text-[12px] font-bold uppercase tracking-[0.12em] transition-colors ${
                      on ? "border-dc-ink text-dc-ink" : "border-transparent text-dc-ink-2 hover:text-dc-ink"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10.5px] tabular-nums ${on ? "text-dc-gold" : "text-dc-ink-2/70"}`}>{n}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-2 pb-2.5">
              <span className="mr-0.5 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">
                Đơn vị
              </span>
              {HOSTS.map((h) => {
                const on = h.value === host;
                return (
                  <Link
                    key={h.value}
                    href={hrefFor(sp.slug, h.value, status)}
                    aria-current={on ? "page" : undefined}
                    className={`rounded-full border px-3 py-1 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
                      on
                        ? "border-dc-ink bg-dc-ink text-white"
                        : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
                    }`}
                  >
                    {h.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon="emoji_events"
            title="Chưa có giải nào khớp bộ lọc"
            hint="Thử chuyển sang tab Tất cả hoặc bỏ bộ lọc đơn vị tổ chức."
          />
        ) : (
          <div className="flex flex-col gap-10">
            {seasons.map((season) => (
              <div key={season}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-dc-display text-[13px] font-bold uppercase tracking-[0.18em] text-dc-gold">
                    Mùa {season}
                  </h2>
                  <span aria-hidden="true" className="h-px flex-1 bg-dc-line" />
                  <span className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2 tabular-nums">
                    {list.filter((t) => t.season === season).length} giải
                  </span>
                </div>

                <div className="grid items-start gap-4 md:grid-cols-2">
                  {list
                    .filter((t) => t.season === season)
                    .map((t) => (
                      <TournamentCard key={t.slug} tournament={t} sportSlug={sp.slug} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
