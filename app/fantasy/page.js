import { getFantasy } from "@/lib/fifa-api";
import { readDb } from "@/lib/db";
import { buildSquads } from "@/lib/fantasy-squad";
import FantasyTabs from "./FantasyTabs";

export const revalidate = 30;

export default async function FantasyPage() {
  const data = await getFantasy();
  const db = await readDb();

  // Điểm từng vòng chỉ lấy từ snapshot FIFA đã sync, không trộn dữ liệu mock.
  const standings = (data.standings || []).map((p) => ({
    ...p,
    rounds: p.rounds || {},
    chips: p.chips || {},
    roundPoints: p.roundPoints ?? p.gw ?? 0,
    totalPoints: p.totalPoints ?? p.total ?? 0,
  }));

  // Đội hình (mock) cho mỗi manager, sinh từ pool cầu thủ thật trong db.
  const squads = buildSquads(standings, db.teams || []);

  return (
    <main className="flex-grow w-full px-margin-mobile md:px-margin-desktop py-12">
      <FantasyTabs
        data={data}
        standings={standings}
        squads={squads}
        squadsByRound={data.squadsByRound || {}}
      />
    </main>
  );
}
