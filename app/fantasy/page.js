import { getFantasy } from "@/lib/fifa-api";
import { readDb } from "@/lib/db";
import { buildSquads } from "@/lib/fantasy-squad";
import { applyConfiguredAvatars, buildAvatarLookup, buildAvatarPosLookup } from "@/lib/stats-avatars";
import Link from "next/link";
import FantasyTabs from "./FantasyTabs";
import FantasySeasonBar from "@/components/hub/FantasySeasonBar";
import SportNav from "@/components/hub/SportNav";
import { Chip, PageHeader, Section } from "@/components/hub/ui";
import { findSeason, predictionLeagueBySlug, sportBySlug } from "@/lib/dc42";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fantasy World Cup 2026 | DC42 Hub",
  description: "Bảng điểm Fantasy World Cup 2026 của DC — tổng điểm, từng vòng, thông tin giải và luật.",
};

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
  const avatarPosOf = buildAvatarPosLookup(db.teams || []);
  const enrich = (p) => {
    if (!p) return p;
    const next = { ...p };
    if (!next.crest && flagByCode.get(next.teamCode)) next.crest = flagByCode.get(next.teamCode);
    const a = avatarOf(next.teamCode, next.name);
    if (a) next.avatar = a;
    const pos = avatarPosOf(next.teamCode, next.name);
    if (pos) next.avatarPos = pos;
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

  const football = sportBySlug("bong-da");
  // Trang này là bảng điểm của một mùa cụ thể: Fantasy World Cup 2026.
  const league = predictionLeagueBySlug("fantasy-world-cup");
  const season = findSeason(league, "2026");

  return (
    <>
      {football ? <SportNav sport={football} active="prediction" /> : null}

      <PageHeader
        wide
        eyebrow={
          <>
            <Link href="/the-thao/bong-da/du-doan" className="hover:text-dc-ink">
              Dự đoán &amp; Fantasy
            </Link>{" "}
            · Mùa {season?.season || "2026"}
          </>
        }
        title={league ? `${league.name} ${season?.season || ""}`.trim() : "Fantasy World Cup 2026"}
        lede={season?.note || league?.note}
        aside={
          <div className="flex flex-wrap gap-2">
            <Chip tone="fantasy" icon="stadium">
              Fantasy
            </Chip>
            <Chip icon="check_circle">Đã kết thúc</Chip>
            {season?.players ? <Chip tone="gold">{season.players} người chơi</Chip> : null}
          </div>
        }
      />

      <Section wide>
        <FantasySeasonBar current={{ league: "fantasy-world-cup", season: "2026" }} />
        <FantasyTabs
          data={data}
          standings={standings}
          squads={squads}
          squadsByRound={squadsByRound}
          roundStats={db.roundStats || null}
          playerStats={db.playerStats ? applyConfiguredAvatars(db.playerStats, db.teams || []) : null}
          schedule={db.schedule || null}
        />
      </Section>
    </>
  );
}
