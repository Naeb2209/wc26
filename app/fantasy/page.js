import { getFantasy } from "@/lib/fifa-api";
import { readDb } from "@/lib/db";
import { buildSquads } from "@/lib/fantasy-squad";
import { applyConfiguredAvatars } from "@/lib/stats-avatars";
import FantasyTabs from "./FantasyTabs";

export const dynamic = "force-dynamic";

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

  // Dữ liệu Fantasy sync để crest rỗng → bơm cờ theo teamCode từ db.teams (cho thẻ, modal, insights).
  const flagByCode = new Map((db.teams || []).map((t) => [t.code, t.flag]));
  const withCrest = (p) => (p && !p.crest && flagByCode.get(p.teamCode) ? { ...p, crest: flagByCode.get(p.teamCode) } : p);
  const squadsByRound = {};
  for (const [rk, managers] of Object.entries(data.squadsByRound || {})) {
    squadsByRound[rk] = {};
    for (const [mgr, sq] of Object.entries(managers || {})) {
      squadsByRound[rk][mgr] = {
        ...sq,
        starters: (sq.starters || []).map(withCrest),
        bench: (sq.bench || []).map(withCrest),
        twelfthMan: sq.twelfthMan ? withCrest(sq.twelfthMan) : sq.twelfthMan,
      };
    }
  }

  return (
    <main className="flex-grow w-full px-margin-mobile md:px-margin-desktop py-12">
      <FantasyTabs
        data={data}
        standings={standings}
        squads={squads}
        squadsByRound={squadsByRound}
        roundStats={db.roundStats || null}
        playerStats={db.playerStats ? applyConfiguredAvatars(db.playerStats, db.teams || []) : null}
      />
    </main>
  );
}
