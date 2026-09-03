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
  return sp ? { title: `Dự đoán & Fantasy ${sp.name.toLowerCase()} | DC42 Hub` } : {};
}

export default async function PredictionPage({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  if (!sp || !sp.hasPrediction) notFound();

  const leagues = predictionLeaguesOf(sp.id);
  const fantasy = leagues.filter((l) => l.kind === "Fantasy");
  const predictions = leagues.filter((l) => l.kind === "Dự đoán");

  const allSeasons = leagues.flatMap(leagueSeasons);
  const running = allSeasons.filter((x) => x.status === "running").length;

  return (
    <>
      <SportNav sport={sp} active="prediction" />

      <PageHeader
        eyebrow={`${sp.name} · Dự đoán & Fantasy`}
        title="Chơi cùng các giải lớn"
        lede="Phần chơi dựa trên giải bên ngoài — Premier League, World Cup, Euro. Mỗi giải gom mọi mùa, chọn mùa ngay trên thẻ."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Giải" value={leagues.length} sub={`${fantasy.length} Fantasy · ${predictions.length} Dự đoán`} />
          <Stat label="Tổng số mùa" value={allSeasons.length} sub="tính cả mùa đã kết thúc" />
          <Stat label="Đang chạy" value={running} sub="mùa đang tính điểm" />
          <Stat label="Có bảng điểm" value={allSeasons.filter((x) => x.href).length} sub="mùa xem được trên web" />
        </div>
      </Section>

      <LeagueGroup
        title="Fantasy"
        hint="Chọn đội hình từ cầu thủ thật, tính điểm theo từng vòng."
        icon="stadium"
        tone="fantasy"
        list={fantasy}
      />

      <div className="border-t border-dc-line bg-dc-paper">
        <LeagueGroup
          title="Dự đoán"
          hint="Đoán tỉ số từng trận và đội vô địch, tính điểm theo vòng."
          icon="casino"
          tone="neutral"
          list={predictions}
        />
      </div>
    </>
  );
}

function LeagueGroup({ title, hint, icon, tone, list }) {
  return (
    <Section title={title} hint={hint}>
      {list.length === 0 ? (
        <EmptyState icon={icon} title={`Chưa có giải ${title.toLowerCase()} nào`} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((l) => (
            <LeagueCard key={l.slug} league={l} defaultSeasonId={defaultSeasonOf(l)?.id} tone={tone} icon={icon} />
          ))}
        </div>
      )}
    </Section>
  );
}
