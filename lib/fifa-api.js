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

function roundFromMatchday(md) {
  const n = Number(md);
  return n >= 1 && n <= 3 ? `Lượt ${n}` : null;
}

function formatDateVi(utc) {
  if (!utc) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(utc));
  } catch {
    return "";
  }
}

function formatTimeVi(utc) {
  if (!utc) return "";
  try {
    return (
      new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(utc)) + " (giờ VN)"
    );
  } catch {
    return "";
  }
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

function fdMapStandings(json, fifaRanks) {
  const groups = (json.standings || [])
    .filter((s) => (s.type || "TOTAL") === "TOTAL" && s.group)
    .map((s) => ({
      name: groupLabel(s.group),
      rows: (s.table || []).map((r) => {
        const tla = r.team?.tla || "";
        return {
          team: r.team?.shortName || r.team?.name || tla,
          code: tla,
          flag: r.team?.crest || "",
          iso: "",
          fifaRank: fifaRanks[tla] ?? null,
          p: r.playedGames ?? 0,
          w: r.won ?? 0,
          d: r.draw ?? 0,
          l: r.lost ?? 0,
          gf: r.goalsFor ?? 0,
          ga: r.goalsAgainst ?? 0,
          gd: r.goalDifference ?? 0,
          pts: r.points ?? 0,
        };
      }),
    }))
    .filter((g) => g.name);
  // sắp theo tên bảng A,B,C...
  groups.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return groups;
}

function fdMapGroupSchedule(json) {
  const rounds = ["Lượt 1", "Lượt 2", "Lượt 3"];
  const matches = { "Lượt 1": [], "Lượt 2": [], "Lượt 3": [] };
  for (const m of json.matches || []) {
    if (m.stage !== "GROUP_STAGE") continue;
    const round = roundFromMatchday(m.matchday);
    if (!round) continue;
    matches[round].push({
      id: String(m.id),
      group: groupLabel(m.group) || "Vòng bảng",
      date: formatDateVi(m.utcDate),
      venue: m.venue || "",
      homeCode: m.homeTeam?.tla || m.homeTeam?.shortName || "TBD",
      homeFlag: m.homeTeam?.crest || "",
      homeIso: "",
      awayCode: m.awayTeam?.tla || m.awayTeam?.shortName || "TBD",
      awayFlag: m.awayTeam?.crest || "",
      awayIso: "",
      time: formatTimeVi(m.utcDate),
      lineup: null,
      note: "",
    });
  }
  return { rounds, matches };
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

function afMapStandings(json, fifaRanks) {
  const tables = json.response?.[0]?.league?.standings || [];
  return tables
    .map((table) => ({
      name: groupLabel(table?.[0]?.group),
      rows: (table || []).map((r) => ({
        team: r.team?.name || "",
        code: (r.team?.name || "").slice(0, 3).toUpperCase(),
        flag: r.team?.logo || "",
        iso: "",
        fifaRank: fifaRanks[(r.team?.name || "").toUpperCase()] ?? null,
        p: r.all?.played ?? 0,
        w: r.all?.win ?? 0,
        d: r.all?.draw ?? 0,
        l: r.all?.lose ?? 0,
        gf: r.all?.goals?.for ?? 0,
        ga: r.all?.goals?.against ?? 0,
        gd: r.goalsDiff ?? 0,
        pts: r.points ?? 0,
      })),
    }))
    .filter((g) => g.name);
}

function afMapGroupSchedule(json) {
  const rounds = ["Lượt 1", "Lượt 2", "Lượt 3"];
  const matches = { "Lượt 1": [], "Lượt 2": [], "Lượt 3": [] };
  for (const m of json.response || []) {
    const round = m.league?.round || "";
    const num = round.match(/(\d+)/)?.[1];
    const key = roundFromMatchday(num);
    if (!round.toLowerCase().includes("group") || !key) continue;
    matches[key].push({
      id: String(m.fixture?.id),
      group: "Vòng bảng",
      date: formatDateVi(m.fixture?.date),
      venue: m.fixture?.venue?.name || "",
      homeCode: (m.teams?.home?.name || "TBD").slice(0, 3).toUpperCase(),
      homeFlag: m.teams?.home?.logo || "",
      homeIso: "",
      awayCode: (m.teams?.away?.name || "TBD").slice(0, 3).toUpperCase(),
      awayFlag: m.teams?.away?.logo || "",
      awayIso: "",
      time: formatTimeVi(m.fixture?.date),
      lineup: null,
      note: "",
    });
  }
  return { rounds, matches };
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

async function fetchStandingsFrom(provider, fifaRanks) {
  if (provider === "api-football") {
    return afMapStandings(await afFetch("/standings?league=1&season=2026"), fifaRanks);
  }
  return fdMapStandings(await fdFetch("/competitions/WC/standings"), fifaRanks);
}

async function fetchScheduleFrom(provider) {
  if (provider === "api-football") {
    return afMapGroupSchedule(await afFetch("/fixtures?league=1&season=2026"));
  }
  return fdMapGroupSchedule(await fdFetch("/competitions/WC/matches"));
}

// ---------- public API ----------

export async function getStandings() {
  const db = await readDb();
  const fifaRanks = db.fifaRanks || {};
  for (const provider of providerOrder()) {
    try {
      const groups = await fetchStandingsFrom(provider, fifaRanks);
      if (groups.length) return { groups, source: provider };
      console.warn(`[fifa-api] ${provider} standings rỗng → thử nguồn kế tiếp`);
    } catch (e) {
      console.error(`[fifa-api] ${provider} standings lỗi (${e.message}) → thử nguồn kế tiếp`);
    }
  }
  return { groups: db.groups, source: "sample" };
}

export async function getSchedule() {
  const db = await readDb();
  for (const provider of providerOrder()) {
    try {
      const groupData = await fetchScheduleFrom(provider);
      const total = groupData.rounds.reduce((n, r) => n + groupData.matches[r].length, 0);
      if (total) return { stages: db.stages, schedule: { "Vòng Bảng": groupData }, source: provider };
      console.warn(`[fifa-api] ${provider} schedule rỗng → thử nguồn kế tiếp`);
    } catch (e) {
      console.error(`[fifa-api] ${provider} schedule lỗi (${e.message}) → thử nguồn kế tiếp`);
    }
  }
  return { stages: db.stages, schedule: db.schedule, source: "sample" };
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
  for (const provider of providerOrder()) {
    try {
      const live =
        provider === "api-football"
          ? afMapLive(await afFetch("/fixtures?live=all&league=1"))
          : fdMapLive(await fdFetch("/competitions/WC/matches?status=LIVE"));
      // live === null nghĩa là "không có trận nào đang diễn ra" -> vẫn là câu trả lời hợp lệ
      return { live, channels, source: provider };
    } catch (e) {
      console.error(`[fifa-api] ${provider} live lỗi (${e.message}) → thử nguồn kế tiếp`);
    }
  }
  return { live: db.live, channels, source: "sample" };
}

// ---------- teams ----------

function mapPosition(p = "") {
  const s = String(p).toLowerCase();
  if (s.includes("keeper")) return "Thủ Môn";
  if (s.includes("back") || s.includes("defen")) return "Hậu Vệ";
  if (s.includes("midfield")) return "Tiền Vệ";
  if (s.includes("forward") || s.includes("wing") || s.includes("offen") || s.includes("strik") || s.includes("attack"))
    return "Tiền Đạo";
  return "Tiền Vệ";
}

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

async function fdSquad(code, name) {
  try {
    const j = await fdFetch("/competitions/WC/teams");
    const t = (j.teams || []).find(
      (x) => x.tla === code || x.shortName === name || x.name === name
    );
    if (t && Array.isArray(t.squad) && t.squad.length) {
      return t.squad.map((p) => ({
        name: p.name,
        number: p.shirtNumber ?? null,
        position: mapPosition(p.position),
        isStar: false,
      }));
    }
  } catch (e) {
    console.error("[fifa-api] squad lỗi:", e.message);
  }
  return null;
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
        });
      }
    }
  }

  // đội hình: thử API, fallback hồ sơ mẫu
  let players = null;
  let playersSource = "none";
  if (PROVIDER !== "api-football" && FD_TOKEN) {
    players = await fdSquad(code, row?.team || local?.name);
    if (players) playersSource = "api";
  }
  if (!players && local?.players?.length) {
    players = local.players;
    playersSource = "sample";
  }
  if (!players) players = [];

  // thống kê
  let stats = null;
  if (row && (row.gf || row.ga)) stats = { goals: row.gf, conceded: row.ga, possession: local?.stats?.possession ?? null };
  else if (local?.stats) stats = local.stats;

  return {
    code,
    name: row?.team || local?.name || code,
    flag: row?.flag || (local ? flagUrl(local.iso, 320) : ""),
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

export { flagUrl };
