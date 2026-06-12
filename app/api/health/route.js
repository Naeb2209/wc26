import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDb();
  const groupMatches = db.schedule?.["Vòng Bảng"]?.matches || {};
  const matchCount = Object.values(groupMatches).reduce(
    (count, matches) => count + (matches?.length || 0),
    0
  );

  return NextResponse.json({
    mode: "local-snapshot",
    sync: db.dataSync || null,
    standings: { source: "db.json", groups: db.groups?.length || 0 },
    teams: { source: "db.json", teams: db.teams?.length || 0 },
    schedule: { source: "db.json", groupMatches: matchCount },
    live: {
      mode: "runtime-api-with-db-fallback",
      providersConfigured: Boolean(
        process.env.FOOTBALL_DATA_TOKEN || process.env.API_FOOTBALL_KEY
      ),
    },
    note:
      "Standings, teams and schedule are read only from data/db.json. Run npm run sync-football to refresh them manually.",
  });
}
