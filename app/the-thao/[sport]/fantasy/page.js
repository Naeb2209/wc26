import Link from "next/link";
import { notFound } from "next/navigation";
import { defaultSeasonOf, leagueSeasons, predictionLeaguesOf, sportBySlug, sports } from "@/lib/dc42";
import { EmptyState, PageHeader, Section, Stat } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import LeagueCard from "@/components/hub/LeagueCard";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return sports()
    .filter((s) => s.hasPrediction)
    .map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  return sp ? { title: `Fantasy ${sp.name.toLowerCase()} | DC42 Hub` } : {};
}

export default async function FantasyPage({ params, searchParams }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  if (!sp || !sp.hasPrediction) notFound();

  // Bấm một thẻ Fantasy ở trang môn thì sang đây với ?giai= -> chỉ mở đúng giải đó,
  // không dội lại cả hai thẻ y như trang vừa rời đi.
  const sq = (await searchParams) || {};
  const all = predictionLeaguesOf(sp.id);
  const only = all.find((l) => l.slug === sq.giai) || null;
  const leagues = only ? [only] : all;
  const allSeasons = leagues.flatMap(leagueSeasons);
  const running = allSeasons.filter((x) => x.status === "running").length;
  const bets = allSeasons.reduce((n, s) => n + (s.predictions || []).length, 0);

  return (
    <>
      <SportNav sport={sp} active="fantasy" />

      <PageHeader
        eyebrow={`${sp.name} · Fantasy`}
        title={only ? only.name : "Chơi cùng các giải lớn"}
        lede={
          only
            ? only.note
            : "Fantasy dựa trên giải bên ngoài — World Cup, Premier League. Mỗi giải gom mọi mùa, chọn mùa ngay trên thẻ; mini game dự đoán của mùa nằm luôn trong thẻ."
        }
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Giải Fantasy" value={leagues.length} sub="chơi cùng giải bên ngoài" />
          <Stat label="Tổng số mùa" value={allSeasons.length} sub="tính cả mùa đã kết thúc" />
          <Stat label="Đang chạy" value={running} sub="mùa đang tính điểm" />
          <Stat label="Mini game" value={bets} sub="kèm theo các mùa" />
        </div>
      </Section>

      <Section
        title="Fantasy"
        hint="Chọn đội hình từ cầu thủ thật, tính điểm theo từng vòng."
        action={
          only ? (
            <Link
              href={`/the-thao/${sp.slug}/fantasy`}
              className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
            >
              Tất cả {all.length} giải →
            </Link>
          ) : undefined
        }
      >
        {leagues.length === 0 ? (
          <EmptyState icon="stadium" title="Chưa có giải Fantasy nào" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* CM */}
            {leagues.map((l) => (
              <div key={l.slug} id={l.slug} className="scroll-mt-24">
                <LeagueCard league={l} defaultSeasonId={defaultSeasonOf(l)?.id} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
