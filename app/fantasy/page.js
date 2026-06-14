import { getFantasy } from "@/lib/fifa-api";
import { readDb } from "@/lib/db";
import { buildSquads } from "@/lib/fantasy-squad";
import roundsMock from "@/data/fantasy-rounds.mock.json";
import FantasyTabs from "./FantasyTabs";

export const revalidate = 60;

export default async function FantasyPage() {
  const data = await getFantasy();
  const db = await readDb();

  // Chuẩn hoá: data có thể dùng gw/total (db.json) hoặc roundPoints/totalPoints.
  // rounds (điểm từng vòng cho tab Round) lấy từ data nếu có, nếu không thì gộp từ mock.
  const standings = (data.standings || []).map((p) => ({
    ...p,
    rounds: p.rounds ?? roundsMock.byManager?.[p.manager] ?? {},
    chips: p.chips ?? roundsMock.chipsByManager?.[p.manager] ?? {},
    roundPoints: p.roundPoints ?? p.gw ?? 0,
    totalPoints: p.totalPoints ?? p.total ?? 0,
  }));

  // Đội hình (mock) cho mỗi manager, sinh từ pool cầu thủ thật trong db.
  const squads = buildSquads(standings, db.teams || []);

  return (
    <main className="flex-grow w-full px-margin-mobile md:px-margin-desktop py-12">
      <FantasyTabs data={data} standings={standings} squads={squads} />
    </main>
  );
}
