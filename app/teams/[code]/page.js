import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/fifa-api";

export const revalidate = 3600;

const POSITION_ORDER = ["Tiền Đạo", "Tiền Vệ", "Hậu Vệ", "Thủ Môn"];
const POSITION_ICON = {
  "Tiền Đạo": "sports_soccer",
  "Tiền Vệ": "directions_run",
  "Hậu Vệ": "shield",
  "Thủ Môn": "front_hand",
};

function StatTile({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-data-mono text-on-surface font-bold text-[14px]">{value}</p>
      <p className="font-label-caps text-[8px] text-on-surface-variant uppercase">{label}</p>
    </div>
  );
}

function PlayerCard({ p }) {
  const isGK = p.position === "Thủ Môn";
  const hasStats = p.ovr != null || p.goals != null || p.cleanSheets != null || p.assists != null;
  return (
    <div
      className={`relative bg-surface rounded-lg border border-outline-variant overflow-hidden group hover:border-primary transition-all duration-300 ${
        p.isStar ? "gold-glow" : ""
      }`}
    >
      <div className="flex items-center p-3 gap-4">
        <div
          className={`relative w-16 h-16 shrink-0 rounded-full overflow-hidden bg-surface-dim flex items-center justify-center ${
            p.isStar ? "border-2 border-[#ffd700]" : ""
          }`}
        >
          <span className="material-symbols-outlined text-2xl text-outline">person</span>
          {p.isStar && (
            <div className="absolute bottom-0 right-0 bg-[#ffd700] rounded-full p-0.5 flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px] text-black font-bold">star</span>
            </div>
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div>
            {p.number != null && <span className="text-outline font-data-mono text-[12px]">#{p.number}</span>}
            <h4 className="font-bold text-on-surface uppercase text-[15px] leading-tight">{p.name}</h4>
          </div>
          {hasStats ? (
            <div className="flex gap-3 mt-1">
              {p.ovr != null && (
                <div className="text-center">
                  <p className="font-data-mono text-primary font-bold text-[14px]">{p.ovr}</p>
                  <p className="font-label-caps text-[8px] text-on-surface-variant">OVR</p>
                </div>
              )}
              {isGK
                ? p.cleanSheets != null && <StatTile value={p.cleanSheets} label="Sạch Lưới" />
                : p.goals != null && <StatTile value={p.goals} label="Bàn" />}
              {p.assists != null && <StatTile value={p.assists} label="Kiến Tạo" />}
            </div>
          ) : (
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-1 uppercase">{p.position}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, pct, color }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
        <span className="font-data-mono text-data-mono font-bold">{value}</span>
      </div>
      <div className="w-full bg-surface-container rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function TeamDetailPage({ params }) {
  const team = await getTeam(params.code);
  if (!team) notFound();

  const grouped = POSITION_ORDER.map((pos) => ({
    pos,
    players: team.players.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  return (
    <main className="w-full pb-20 flex-grow">
      {/* Hero */}
      <section className="relative w-full h-[300px] md:h-[420px] bg-surface-container-highest overflow-hidden flex items-end">
        <div className="absolute inset-0 z-0">
          <img
            alt="Sân vận động World Cup"
            className="w-full h-full object-cover opacity-60"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrd6QunhCnPyiABRawATjzfIe1eZzNY0UQpj7460zm1Wfa_XPDThJiwjnOfaeV2IsV8UOyxBIPm8v4IjZeNyk2u1PCQp0zJLqerTwbmpvFoiOMVw5U-brQHFha5r1UpjBmG9rOjSHnIx9heqbYwqcyA6dob74pEWi2ZT3er3cez-rJP3FHM3Ipqhp3x5MLXAxfCXivWiqHETj0g_BD9lvZ9LQS6RXEsxFiYP70ywBEQkx-fZWoeN68ntD17JGyvibFcn_V4hS30iTq"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto pb-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-28 h-28 md:w-40 md:h-40 bg-white rounded-full shadow-lg border-4 border-surface flex items-center justify-center overflow-hidden shrink-0">
            <img src={team.flag} alt={team.name} className="w-3/4 h-3/4 object-contain" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase mb-2">
              {team.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {team.fifaRank != null && (
                <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps px-3 py-1 rounded-full uppercase">
                  Hạng {team.fifaRank} FIFA
                </span>
              )}
              {team.titles && (
                <span className="text-on-surface-variant font-body-md text-body-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">emoji_events</span> {team.titles}
                </span>
              )}
              {team.confederation && (
                <span className="text-on-surface-variant font-body-md text-body-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">location_on</span> {team.confederation}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: squad */}
        <div className="lg:col-span-2 flex flex-col gap-12">
          <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">Đội Hình</h2>
            {team.players.length > 0 && (
              <span className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-full uppercase">
                {team.players.length} cầu thủ
              </span>
            )}
          </div>

          {grouped.length > 0 ? (
            grouped.map((g) => (
              <section key={g.pos}>
                <h3 className="font-headline-md text-headline-md text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">{POSITION_ICON[g.pos]}</span> {g.pos}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {g.players.map((p, i) => (
                    <PlayerCard key={p.number ?? i} p={p} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3">groups</span>
              <p className="font-body-md max-w-md">
                Danh sách cầu thủ của {team.name} chưa có trong nguồn dữ liệu hiện tại. Sẽ tự cập nhật khi liên đoàn công bố đội hình chính thức.
              </p>
            </div>
          )}
        </div>

        {/* Right: schedule + stats */}
        <div className="flex flex-col gap-8">
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
            <div className="bg-on-primary-fixed-variant text-on-primary p-4">
              <h3 className="font-headline-md text-headline-md uppercase flex items-center gap-2">
                <span className="material-symbols-outlined">calendar_month</span> Lịch Thi Đấu
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {team.matches.length > 0 ? (
                team.matches.map((m, i) => (
                  <div key={i} className="border border-outline-variant rounded-lg p-3 hover:bg-surface-container-low transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label-caps text-label-caps text-primary bg-primary/10 px-2 py-1 rounded">{m.round}</span>
                      <span className="font-data-mono text-data-mono text-on-surface-variant">{m.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-headline-md text-[16px] font-bold w-2/5">{m.homeCode}</span>
                      <div className="bg-surface-container-high px-3 py-1 rounded font-data-mono text-data-mono font-bold">{m.time}</div>
                      <span className="font-headline-md text-[16px] font-bold w-2/5 text-right">{m.awayCode}</span>
                    </div>
                    {m.venue && (
                      <div className="mt-2 text-center font-label-caps text-label-caps text-on-surface-variant flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">stadium</span> {m.venue}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="font-body-md text-on-surface-variant text-center py-4">Chưa có lịch thi đấu.</p>
              )}
              <Link
                href="/schedule"
                className="w-full mt-2 py-2 border-2 border-secondary text-secondary hover:bg-secondary hover:text-on-secondary font-label-caps text-label-caps uppercase rounded-lg transition-colors text-center"
              >
                Xem toàn bộ lịch thi đấu
              </Link>
            </div>
          </div>

          {team.stats && (
            <div className="bg-surface rounded-xl border border-outline-variant p-6">
              <h3 className="font-headline-md text-headline-md mb-4 uppercase text-on-background">Thống kê</h3>
              <div className="space-y-4">
                <StatBar label="Bàn thắng" value={team.stats.goals} pct={Math.min(100, team.stats.goals * 8)} color="bg-tertiary-fixed" />
                <StatBar label="Bàn thua" value={team.stats.conceded} pct={Math.min(100, team.stats.conceded * 8)} color="bg-error" />
                {team.stats.possession != null && (
                  <StatBar label="Kiểm soát bóng (TB)" value={`${team.stats.possession}%`} pct={team.stats.possession} color="bg-primary" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
