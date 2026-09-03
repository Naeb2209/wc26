import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate, sportBySlug, sports, tournamentsOf } from "@/lib/dc42";
import { Card, Chip, EmptyState, PageHeader, Section, StatusChip } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";

export const dynamic = "force-dynamic";

const ORDER = { running: 0, upcoming: 1, finished: 2 };

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
  const host = sq.don_vi || "all";

  const all = [...tournamentsOf(sp.id)].sort(
    (a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) || String(b.startDate).localeCompare(String(a.startDate))
  );
  const list = host === "all" ? all : all.filter((t) => t.host === host);
  const seasons = [...new Set(list.map((t) => t.season))].sort().reverse();

  return (
    <>
      <SportNav sport={sp} active="tournaments" />

      <PageHeader
        eyebrow={`${sp.name} · Giải đấu`}
        title="Giải đấu trong năm"
        lede="Giải do DC tự tổ chức và giải do TMA tổ chức mà DC tham gia. Mỗi giải có lịch, kết quả, bảng xếp hạng và album riêng."
      />

      <Section>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Đơn vị</span>
          <HostLink sport={sp.slug} label="Tất cả" value="all" active={host === "all"} />
          <HostLink sport={sp.slug} label="DC" value="DC" active={host === "DC"} />
          <HostLink sport={sp.slug} label="TMA" value="TMA" active={host === "TMA"} />
        </div>

        {list.length === 0 ? (
          <EmptyState icon="emoji_events" title="Chưa có giải nào khớp bộ lọc" hint="Thử bỏ bộ lọc đơn vị tổ chức." />
        ) : (
          <div className="flex flex-col gap-10">
            {seasons.map((season) => (
              <div key={season}>
                <h2 className="mb-4 font-dc-display text-[13px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">
                  Mùa {season}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {list
                    .filter((t) => t.season === season)
                    .map((t) => (
                      <Card key={t.slug} href={`/the-thao/${sp.slug}/giai-dau/${t.slug}`} className="flex flex-col gap-3 p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip tone={t.host === "TMA" ? "neutral" : "gold"}>{t.host}</Chip>
                          <StatusChip status={t.status} />
                        </div>
                        <p className="font-dc-display text-[22px] font-bold leading-tight text-dc-ink">{t.name}</p>
                        <p className="text-body-md text-dc-ink-2">{t.summary}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-dc-line pt-3 text-[13px]">
                          <div>
                            <dt className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
                              Thể thức
                            </dt>
                            <dd className="text-dc-ink">{t.format}</dd>
                          </div>
                          <div>
                            <dt className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
                              Thời gian
                            </dt>
                            <dd className="tabular-nums text-dc-ink">
                              {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                            </dd>
                          </div>
                          {t.champion && (
                            <div className="col-span-2">
                              <dt className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
                                Vô địch
                              </dt>
                              <dd className="text-dc-ink">{t.champion}</dd>
                            </div>
                          )}
                        </dl>
                      </Card>
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

function HostLink({ sport, label, value, active }) {
  const href = value === "all" ? `/the-thao/${sport}/giai-dau` : `/the-thao/${sport}/giai-dau?don_vi=${value}`;
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
        active ? "border-dc-ink bg-dc-ink text-white" : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
      }`}
    >
      {label}
    </Link>
  );
}
