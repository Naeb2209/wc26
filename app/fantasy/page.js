import { getFantasy } from "@/lib/fifa-api";
import { readDb } from "@/lib/db";
import { buildSquads } from "@/lib/fantasy-squad";
import { applyConfiguredAvatars, buildAvatarLookup } from "@/lib/stats-avatars";
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

  // Dữ liệu Fantasy sync nhúng cứng crest/avatar lúc sync. Bơm lại từ db.teams lúc render để
  // crest rỗng có cờ, và avatar luôn theo nguồn local mới nhất (cầu thủ thêm avatar sau khi sync
  // vẫn hiện đúng). Khớp theo teamCode + tên (chuẩn hoá), dùng cho thẻ, modal, insights.
  const flagByCode = new Map((db.teams || []).map((t) => [t.code, t.flag]));
  const avatarOf = buildAvatarLookup(db.teams || []);
  const enrich = (p) => {
    if (!p) return p;
    const next = { ...p };
    if (!next.crest && flagByCode.get(next.teamCode)) next.crest = flagByCode.get(next.teamCode);
    const a = avatarOf(next.teamCode, next.name);
    if (a) next.avatar = a;
    return next;
  };
  const squadsByRound = {};
  for (const [rk, managers] of Object.entries(data.squadsByRound || {})) {
    squadsByRound[rk] = {};
    for (const [mgr, sq] of Object.entries(managers || {})) {
      squadsByRound[rk][mgr] = {
        ...sq,
        starters: (sq.starters || []).map(enrich),
        bench: (sq.bench || []).map(enrich),
        twelfthMan: sq.twelfthMan ? enrich(sq.twelfthMan) : sq.twelfthMan,
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
