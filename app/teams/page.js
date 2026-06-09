import Link from "next/link";
import { getTeamsList } from "@/lib/fifa-api";

export const revalidate = 3600;

export default async function TeamsPage() {
  const { teams } = await getTeamsList();

  // nhóm theo bảng
  const byGroup = {};
  for (const t of teams) {
    (byGroup[t.group] = byGroup[t.group] || []).push(t);
  }
  const groupNames = Object.keys(byGroup).sort((a, b) => a.localeCompare(b, "vi"));

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <header className="mb-10 border-b-2 border-surface-variant pb-4">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
          Các Đội Tuyển
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          {teams.length} đội tuyển quốc gia tại World Cup 2026. Bấm vào một đội để xem cầu thủ, lịch thi đấu và thống kê.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {groupNames.map((gName) => (
          <section key={gName}>
            <h2 className="font-headline-md text-headline-md text-primary mb-4">{gName}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {byGroup[gName].map((t) => (
                <Link
                  key={t.code}
                  href={`/teams/${t.code}`}
                  className="bg-surface border border-outline-variant rounded-xl p-4 flex items-center gap-3 hover:border-primary hover:shadow-[0px_8px_24px_rgba(29,78,216,0.12)] transition-all group"
                >
                  <img
                    src={t.flag}
                    alt={t.name}
                    className="w-12 h-8 object-contain bg-white rounded border border-outline-variant shrink-0"
                  />
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors truncate uppercase">
                      {t.name}
                    </h3>
                    {t.fifaRank != null && (
                      <span className="font-data-mono text-[12px] text-on-surface-variant">Hạng {t.fifaRank} FIFA</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
