import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fmtDate,
  fmtTime,
  formatFee,
  defaultSeasonOf,
  predictionLeaguesOf,
  recentResults,
  relativeDay,
  sportBySlug,
  sports,
  sportSummary,
  tournamentsOf,
  upcomingSessionsOf,
  weekdayOf,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, LeagueLogo, PageHeader, Section, Stat, StatusChip } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SportHero from "@/components/hub/SportHero";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return sports().map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  return sp ? { title: `${sp.name} | DC42 Hub`, description: sp.blurb } : {};
}

export default async function SportOverviewPage({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  if (!sp) notFound();

  const sum = sportSummary(sp.id);
  const nextSessions = upcomingSessionsOf(sp.id, 2).slice(0, 3);
  const tours = tournamentsOf(sp.id);
  const running = tours.filter((t) => t.status === "running");
  const leagues = predictionLeaguesOf(sp.id);
  const results = recentResults(20).filter((r) => r.sport === sp.id).slice(0, 4);

  return (
    <>
      <SportNav sport={sp} active="overview" />

      <PageHeader eyebrow="Thể thao" title={sp.name} lede={sp.blurb} />

      <SportHero sport={sp} />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Buổi mỗi tuần" value={sum.sessionsPerWeek} sub="Giao lưu cố định" />
          <Stat label="Giải đang diễn ra" value={sum.running} sub={`${sum.tournaments} giải đã lưu`} />
          <Stat
            label="Buổi gần nhất"
            value={sum.nextSession ? relativeDay(sum.nextSession.startsAt) : "—"}
            sub={sum.nextSession ? `${weekdayOf(sum.nextSession.startsAt)} · ${fmtTime(sum.nextSession.startsAt)}` : undefined}
          />
          <Stat
            label={sp.hasPrediction ? "Fantasy" : "Kết quả đã lưu"}
            value={sp.hasPrediction ? sum.fantasyLeagues : results.length}
            sub={sp.hasPrediction ? "giải theo mùa" : "trận gần đây"}
          />
        </div>
      </Section>

      <div className="border-y border-dc-line bg-dc-paper">
        <Section
          title="Giao lưu hằng tuần"
          hint="Kèo lặp lại mỗi tuần, cần điểm danh để chốt sân."
          action={
            <Link
              href={`/the-thao/${sp.slug}/giao-luu`}
              className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
            >
              Điểm danh →
            </Link>
          }
        >
          {nextSessions.length === 0 ? (
            <EmptyState icon="event_busy" title="Hai tuần tới chưa có buổi nào" />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {nextSessions.map((s) => (
                <Card key={s.id} href={`/the-thao/${sp.slug}/giao-luu#${s.id}`} className="flex flex-col gap-2 p-5">
                  <div className="flex items-center gap-2">
                    <Chip tone={s.cancelled ? "live" : "gold"}>{s.cancelled ? "Đã huỷ" : relativeDay(s.startsAt)}</Chip>
                  </div>
                  <p className="font-dc-display text-[17px] font-bold leading-snug text-dc-ink">{s.title}</p>
                  <p className="text-[13px] text-dc-ink-2">
                    {weekdayOf(s.startsAt)}, {fmtDate(s.startsAt)} · {fmtTime(s.startsAt)}
                  </p>
                  <p className="text-[13px] text-dc-ink-2">
                    {s.venue?.name} · {s.capacity} chỗ · {formatFee(s.fee)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Giải đấu trong năm"
        action={
          <Link
            href={`/the-thao/${sp.slug}/giai-dau`}
            className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
          >
            Tất cả {tours.length} giải →
          </Link>
        }
      >
        {tours.length === 0 ? (
          <EmptyState icon="emoji_events" title="Chưa có giải nào cho môn này" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(running.length > 0 ? running : tours.slice(0, 2)).map((t) => (
              <Card key={t.slug} href={`/the-thao/${sp.slug}/giai-dau/${t.slug}`} className="flex flex-col gap-3 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={t.host === "TMA" ? "neutral" : "gold"}>{t.host}</Chip>
                  <StatusChip status={t.status} />
                  <Chip>Mùa {t.season}</Chip>
                </div>
                <p className="font-dc-display text-[21px] font-bold leading-tight text-dc-ink">{t.name}</p>
                <p className="text-body-md text-dc-ink-2">{t.summary}</p>
                <p className="text-[13px] tabular-nums text-dc-ink-2">
                  {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {sp.hasPrediction && (
        <div className="border-t border-dc-line bg-dc-paper">
          <Section
            title="Fantasy"
            hint="Phần chơi cùng các giải lớn — không phải giải DC tự tổ chức. Mini game dự đoán nằm trong từng mùa."
            action={
              <Link
                href={`/the-thao/${sp.slug}/fantasy`}
                className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
              >
                Xem tất cả →
              </Link>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {leagues.map((l) => {
                const cur = defaultSeasonOf(l);
                const bets = (cur?.predictions || []).length;
                return (
                  <Card key={l.slug} href={`/the-thao/${sp.slug}/fantasy`} className="flex flex-col gap-2 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <Chip tone="fantasy" icon="stadium">
                        {l.kind}
                      </Chip>
                      <span className="font-dc-display text-[10px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
                        {(l.seasons || []).length} mùa
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <LeagueLogo league={l} />
                      <p className="font-dc-display text-[16px] font-bold leading-snug text-dc-ink">{l.name}</p>
                    </div>
                    <p className="mt-auto text-[12.5px] text-dc-ink-2 tabular-nums">
                      Mùa {cur?.season}
                      {cur?.players ? ` · ${cur.players} người chơi` : ""}
                      {bets ? ` · ${bets} mini game` : ""}
                    </p>
                  </Card>
                );
              })}
            </div>
          </Section>
        </div>
      )}
    </>
  );
}
