import Link from "next/link";
import { leagueSeasons, predictionLeaguesOf, sportSummary, sports } from "@/lib/dc42";
import { PageHeader, Section, sportMeta } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thể thao | DC42 Hub",
  description: "Chọn môn: bóng đá hoặc cầu lông. Giao lưu hằng tuần, giải đấu trong năm và các giải dự đoán nằm trong từng môn.",
};

export default function SportsHubPage() {
  const list = sports();

  return (
    <>
      <PageHeader
        eyebrow="Thể thao"
        title="Chọn môn"
        lede="Mỗi môn gồm kèo giao lưu hằng tuần và giải đấu trong năm — bóng đá thêm phần Fantasy. Bấm vào một môn để xem cụ thể."
      />

      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {list.map((sp) => {
            const meta = sportMeta(sp.id);
            const sum = sportSummary(sp.id);
            const seasons = predictionLeaguesOf(sp.id).flatMap(leagueSeasons).length;

            // Chú thích: bên trong môn này có gì, kèm số thật từ dữ liệu.
            const notes = [
              { icon: "groups", label: "Giao lưu", value: `${sum.sessionsPerWeek} buổi/tuần` },
              { icon: "emoji_events", label: "Giải đấu", value: `${sum.tournaments} giải` },
            ];
            if (sp.hasPrediction) {
              notes.push({ icon: "casino", label: "Fantasy", value: `${seasons} mùa` });
            }

            return (
              <Link
                key={sp.id}
                href={`/the-thao/${sp.slug}`}
                className="group flex flex-col rounded-2xl border border-dc-line bg-white p-6 transition-[box-shadow,border-color] hover:border-dc-gold/50 hover:shadow-[0_14px_36px_rgba(0,0,0,0.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold sm:p-7"
              >
                {/* Huy hiệu môn + tên */}
                <div className="flex items-center gap-4">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ring-1 ${meta.bg} ${meta.ring}`}>
                    <span className={`material-symbols-outlined text-[28px] ${meta.text}`}>{sp.icon}</span>
                  </span>
                  <h2 className="min-w-0 font-dc-display text-[28px] font-bold italic leading-none tracking-tight text-dc-ink sm:text-[32px]">
                    {sp.name}
                  </h2>
                </div>
                <p className="mt-4 text-[13.5px] leading-snug text-dc-ink-2">{sp.blurb}</p>

                {/* Chú thích */}
                <dl className="mt-5 flex flex-col divide-y divide-dc-line border-y border-dc-line">
                  {notes.map((n) => (
                    <div key={n.label} className="flex items-center gap-3 py-2.5">
                      <span className="material-symbols-outlined text-[19px] text-dc-gold">{n.icon}</span>
                      <dt className="font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
                        {n.label}
                      </dt>
                      <dd className="ml-auto whitespace-nowrap font-dc-display text-[13px] font-bold tabular-nums text-dc-ink">
                        {n.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold">
                  Xem chi tiết
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
