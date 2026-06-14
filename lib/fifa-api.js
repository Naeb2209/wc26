import { readDb } from "./db";
import { flagUrl } from "./flags";

/**
 * Lớp tích hợp dữ liệu World Cup 2026.
 * - Mặc định dùng football-data.org (v4). Đặt FOOTBALL_API_PROVIDER=api-football để đổi nhà cung cấp.
 * - Có cache (revalidate) để không vượt giới hạn request.
 * - Nếu thiếu API key hoặc API lỗi -> tự fallback về data mẫu trong data/db.json (web không bao giờ vỡ).
 */

const PROVIDER = process.env.FOOTBALL_API_PROVIDER || "football-data";
const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || "";
const AF_KEY = process.env.API_FOOTBALL_KEY || "";
const REVALIDATE = Number(process.env.FOOTBALL_API_REVALIDATE || 3600); // giây

const fetchOpts = { next: { revalidate: REVALIDATE } };

// ---------- helpers ----------

function groupLabel(raw) {
  if (!raw) return null;
  const letter = String(raw).replace(/group/i, "").replace(/[_\s]/g, "").trim().toUpperCase();
  return letter ? `Bảng ${letter}` : null;
}

// ---------- football-data.org ----------

async function fdFetch(path) {
  const res = await fetch(`https://api.football-data.org/v4${path}`, {
    ...fetchOpts,
    headers: { "X-Auth-Token": FD_TOKEN },
  });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  return res.json();
}

// ---------- API-Football (v3) ----------

async function afFetch(path) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    ...fetchOpts,
    headers: { "x-apisports-key": AF_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // API-Football trả 200 kèm "errors" khi sai key hoặc hết quota -> coi là lỗi để failover
  const errs = json.errors;
  const errCount = Array.isArray(errs) ? errs.length : errs ? Object.keys(errs).length : 0;
  if (errCount) throw new Error(`quota/errors ${JSON.stringify(errs).slice(0, 120)}`);
  return json;
}

// ---------- failover ----------

function hasKeyFor(provider) {
  return provider === "api-football" ? !!AF_KEY : !!FD_TOKEN;
}

/**
 * Thứ tự thử nguồn: football-data trước, rồi api-football.
 * Nếu đặt FOOTBALL_API_PROVIDER thì nguồn đó được ưu tiên lên đầu.
 * Chỉ giữ lại các nguồn đã có key.
 */
export function providerOrder() {
  const base = ["football-data", "api-football"];
  const order =
    PROVIDER && base.includes(PROVIDER) ? [PROVIDER, ...base.filter((p) => p !== PROVIDER)] : base;
  return order.filter(hasKeyFor);
}

// ---------- public API ----------

// Sắp các đội trong bảng: ưu tiên điểm, hiệu số; khi chưa đá (bằng nhau)
// thì xếp theo thứ hạng FIFA (rank nhỏ = mạnh hơn, lên trên).
function sortGroupRows(groups) {
  for (const g of groups) {
    g.rows.sort((a, b) => {
      if ((b.pts ?? 0) !== (a.pts ?? 0)) return (b.pts ?? 0) - (a.pts ?? 0);
      if ((b.gd ?? 0) !== (a.gd ?? 0)) return (b.gd ?? 0) - (a.gd ?? 0);
      const ra = a.fifaRank ?? Infinity;
      const rb = b.fifaRank ?? Infinity;
      return ra - rb;
    });
  }
  return groups;
}

export async function getStandings() {
  const db = await readDb();
  return { groups: sortGroupRows(db.groups), source: "snapshot" };
}

// kênh VTV phát một trận (theo cặp mã đội), fallback về kênh mặc định
export function resolveChannel(broadcast, home, away) {
  if (!broadcast) return null;
  return broadcast.byMatch?.[`${home}-${away}`] || broadcast.default || null;
}

function annotateChannels(schedule, broadcast, fifaRanks = {}) {
  const vb = schedule?.["Vòng Bảng"]?.matches;
  if (vb) {
    for (const r of Object.keys(vb)) {
      for (const m of vb[r]) {
        m.channel = resolveChannel(broadcast, m.homeCode, m.awayCode);
        m.homeRank = fifaRanks[m.homeCode] ?? null;
        m.awayRank = fifaRanks[m.awayCode] ?? null;
      }
    }
  }
  return schedule;
}

export async function getSchedule() {
  const db = await readDb();
  return {
    stages: db.stages,
    schedule: annotateChannels(db.schedule, db.broadcast, db.fifaRanks),
    source: "snapshot",
  };
}

// ---------- live ----------

function fdMapLive(json) {
  const m = (json.matches || []).find((x) => ["IN_PLAY", "PAUSED", "LIVE"].includes(x.status));
  if (!m) return null;
  const tag = m.status === "PAUSED" ? "NGHỈ" : "ĐANG ĐÁ";
  return {
    group: [groupLabel(m.group), tag].filter(Boolean).join(" - "),
    minute: m.minute ? `${m.minute}'` : tag,
    homeCode: m.homeTeam?.tla || m.homeTeam?.shortName || "",
    homeFlag: m.homeTeam?.crest || "",
    homeIso: "",
    awayCode: m.awayTeam?.tla || m.awayTeam?.shortName || "",
    awayFlag: m.awayTeam?.crest || "",
    awayIso: "",
    homeScore: m.score?.fullTime?.home ?? 0,
    awayScore: m.score?.fullTime?.away ?? 0,
    stats: null,
    commentary: [],
    clock: m.minute ? `${m.minute}' / Live` : "Live",
    activeChannel: "VTV3",
  };
}

function afMapLive(json) {
  const m = (json.response || [])[0];
  if (!m) return null;
  return {
    group: `Hiệp ${m.fixture?.status?.short || ""} - ĐANG ĐÁ`,
    minute: m.fixture?.status?.elapsed ? `${m.fixture.status.elapsed}'` : "ĐANG ĐÁ",
    homeCode: (m.teams?.home?.name || "").slice(0, 3).toUpperCase(),
    homeFlag: m.teams?.home?.logo || "",
    homeIso: "",
    awayCode: (m.teams?.away?.name || "").slice(0, 3).toUpperCase(),
    awayFlag: m.teams?.away?.logo || "",
    awayIso: "",
    homeScore: m.goals?.home ?? 0,
    awayScore: m.goals?.away ?? 0,
    stats: null,
    commentary: [],
    clock: m.fixture?.status?.elapsed ? `${m.fixture.status.elapsed}' / Live` : "Live",
    activeChannel: "VTV3",
  };
}

export async function getLive() {
  const db = await readDb();
  const channels = db.channels;
  // gắn kênh phát sóng cho trận live + đặt làm kênh đang xem mặc định
  const withChannel = (live) => {
    if (live) {
      const ch = resolveChannel(db.broadcast, live.homeCode, live.awayCode);
      if (ch) {
        live.broadcastChannel = ch;
        live.activeChannel = ch;
      }
    }
    return live;
  };
  for (const provider of providerOrder()) {
    try {
      const live =
        provider === "api-football"
          ? afMapLive(await afFetch("/fixtures?live=all&league=1"))
          : fdMapLive(await fdFetch("/competitions/WC/matches?status=LIVE"));
      // live === null nghĩa là "không có trận nào đang diễn ra" -> vẫn là câu trả lời hợp lệ
      return { live: withChannel(live), channels, source: provider };
    } catch (e) {
      console.error(`[fifa-api] ${provider} live lỗi (${e.message}) → thử nguồn kế tiếp`);
    }
  }
  return { live: withChannel(db.live), channels, source: "sample" };
}

// ---------- teams ----------

export async function getTeamsList() {
  const { groups, source } = await getStandings();
  const teams = [];
  for (const g of groups) {
    for (const r of g.rows) {
      teams.push({
        code: r.code,
        name: r.team,
        flag: r.flag || flagUrl(r.iso, 80),
        fifaRank: r.fifaRank,
        group: g.name,
      });
    }
  }
  return { teams, source };
}

export async function getTeam(code) {
  const db = await readDb();
  const local = db.teams.find((t) => t.code === code) || null;

  // header + stats từ standings
  const { groups } = await getStandings();
  let row = null;
  let group = null;
  for (const g of groups) {
    const f = g.rows.find((r) => r.code === code);
    if (f) {
      row = f;
      group = g.name;
      break;
    }
  }
  if (!row && !local) return null;

  // các trận của đội từ schedule
  const { schedule } = await getSchedule();
  const vb = schedule["Vòng Bảng"]?.matches || {};
  const matches = [];
  for (const round of Object.keys(vb)) {
    for (const m of vb[round]) {
      if (m.homeCode === code || m.awayCode === code) {
        matches.push({
          round: `Vòng Bảng - ${round}`,
          date: m.date,
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          time: m.time,
          venue: m.venue,
          channel: m.channel || null,
        });
      }
    }
  }

  const players = local?.players || [];
  const playersSource = players.length ? "snapshot" : "none";

  // thống kê
  let stats = null;
  if (row && (row.gf || row.ga)) stats = { goals: row.gf, conceded: row.ga, possession: local?.stats?.possession ?? null };
  else if (local?.stats) stats = local.stats;

  return {
    code,
    name: row?.team || local?.name || code,
    flag: row?.flag || local?.flag || (local ? flagUrl(local.iso, 320) : ""),
    fifaRank: row?.fifaRank ?? local?.fifaRank ?? null,
    group,
    titles: local?.titles || "",
    confederation: local?.confederation || group || "",
    stats,
    players,
    playersSource,
    matches: matches.length ? matches : local?.schedule || [],
  };
}

// ---------- fantasy ----------

const FIFA_LEAGUE_ID = process.env.FIFA_LEAGUE_ID || "";
const FIFA_COOKIE = process.env.FIFA_COOKIE || "";
const FIFA_ACCESS_TOKEN = process.env.FIFA_ACCESS_TOKEN || "";

// map response FIFA -> cấu trúc standings của app
export function mapFantasyRanks(ranks) {
  return (ranks || []).map((r, i) => ({
    userId: Number(r.userId),
    rank: r.overallRank ?? i + 1,
    roundRank: r.roundRank ?? i + 1,
    manager: r.userName || `User ${r.userId}`,
    team: "",
    gw: r.roundPoints ?? 0,
    total: r.overallPoints ?? 0,
    roundPoints: r.roundPoints ?? 0,
    totalPoints: r.overallPoints ?? 0,
    prev: r.overallRankPrevious ?? null,
    avatar: r.avatar || "",
  }));
}

function mergeFantasyRanks(liveRanks, savedRanks) {
  const savedByUserId = new Map(
    (savedRanks || []).filter((rank) => rank.userId != null).map((rank) => [Number(rank.userId), rank])
  );
  const savedByManager = new Map((savedRanks || []).map((rank) => [rank.manager, rank]));

  return liveRanks.map((live) => {
    const saved = savedByUserId.get(Number(live.userId)) || savedByManager.get(live.manager) || {};
    return {
      ...saved,
      ...live,
      rounds: saved.rounds || {},
      chips: saved.chips || {},
    };
  });
}

export async function getFantasy() {
  const db = await readDb();
  const base = db.fantasy || { leagueName: "", updatedRound: "", standings: [] };
  const fallback = { ...base, source: "db" };

  // Chỉ gọi FIFA khi có đủ league id + cookie/token (FIFA chặn Akamai nên server có thể bị 403).
  const leagueId = FIFA_LEAGUE_ID || base.leagueId;
  if (!leagueId || (!FIFA_COOKIE && !FIFA_ACCESS_TOKEN)) return fallback;

  try {
    const headers = {
      accept: "application/json, text/plain, */*",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    };
    if (FIFA_COOKIE) headers.cookie = FIFA_COOKIE;
    if (FIFA_ACCESS_TOKEN) headers.authorization = `Bearer ${FIFA_ACCESS_TOKEN}`;

    const res = await fetch(`https://play.fifa.com/api/en/fantasy/ranking/league/${leagueId}?limit=100`, {
      ...fetchOpts,
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const ranks = json?.success?.ranks;
    if (!ranks?.length) throw new Error("ranks rỗng");
    const liveStandings = mapFantasyRanks(ranks);
    return {
      ...base,
      standings: mergeFantasyRanks(liveStandings, base.standings),
      source: "fifa",
    };
  } catch (e) {
    console.error("[fifa-api] fantasy fallback:", e.message);
    return fallback;
  }
}

export { flagUrl };
