import hub from "@/data/dc42.json";

// Lớp dữ liệu cho DC42 Hub.
//
// dc42.json là snapshot tĩnh (import lúc build -> chạy được cả trên serverless read-only).
// Phần hay đổi duy nhất là điểm danh buổi giao lưu, nằm ở lib/dc42-rsvp.js (KV hoặc bộ nhớ).
//
// Mọi mốc thời gian trong JSON là giờ Việt Nam viết dạng "2026-09-05T16:00:00" (không có Z).
// Để server ở múi giờ nào cũng hiện đúng, ta parse thủ công sang Date UTC rồi format với
// timeZone "UTC" — tránh việc Vercel (UTC) và máy local (+07) ra hai kết quả khác nhau.

export const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
export const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function getHub() {
  return hub;
}

/* ---------------- thời gian ---------------- */

export function parseVn(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, hh = "0", mi = "0"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi));
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

/** "Hôm nay" theo giờ Việt Nam, quy về mốc 00:00 UTC để so sánh với parseVn(). */
export function todayVn() {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

export function fmtDate(value, opts = {}) {
  const d = parseVn(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC", ...opts }).format(d);
}

export function fmtDayMonth(value) {
  return fmtDate(value, { day: "2-digit", month: "2-digit", year: undefined });
}

export function fmtTime(value) {
  const d = parseVn(value);
  if (!d || !/[T ]\d{2}:\d{2}/.test(String(value))) return "";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(d);
}

export function weekdayOf(value) {
  const d = parseVn(value);
  return d ? WEEKDAYS[d.getUTCDay()] : "";
}

/** "Hôm nay" / "Ngày mai" / "Còn 3 ngày" / "12 ngày trước". */
export function relativeDay(value) {
  const d = parseVn(value);
  if (!d) return "";
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const diff = Math.round((day - todayVn()) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  if (diff > 1 && diff <= 30) return `Còn ${diff} ngày`;
  if (diff < -1 && diff >= -30) return `${-diff} ngày trước`;
  return fmtDate(value);
}

/* ---------------- tra cứu ---------------- */

const byId = (list, id, key = "id") => (list || []).find((x) => x[key] === id) || null;

export const sports = () => hub.sports || [];
export const sportBySlug = (slug) => byId(hub.sports, slug, "slug");
export const sportSlug = (id) => sportById(id)?.slug || id;

export const memberById = (id) => byId(hub.members, id);
export const venueById = (id) => byId(hub.venues, id);
export const teamById = (id) => byId(hub.teams, id);
export const sportById = (id) => byId(hub.sports, id);
export const memberName = (id) => memberById(id)?.short || memberById(id)?.name || id;
export const teamName = (id) => teamById(id)?.name || id || "Chưa xác định";

/* ---------------- buổi giao lưu ---------------- */

/** Sinh các buổi sắp tới từ mẫu lặp hằng tuần, trong `weeks` tuần tới. */
export function upcomingSessions(weeks = 3) {
  const start = todayVn();
  const out = [];

  for (const tpl of hub.sessionTemplates || []) {
    for (let i = 0; i < weeks * 7; i++) {
      const day = new Date(start.getTime() + i * 86400000);
      if (day.getUTCDay() !== tpl.weekday) continue;
      const date = toIsoDate(day);
      const override = (hub.sessionOverrides || []).find((o) => o.templateId === tpl.id && o.date === date);
      if (override?.cancelled) {
        out.push(makeSession(tpl, date, override, true));
        continue;
      }
      out.push(makeSession(tpl, date, override, false));
    }
  }

  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function makeSession(tpl, date, override, cancelled) {
  const merged = { ...tpl, ...(override || {}) };
  return {
    id: `${tpl.id}@${date}`,
    templateId: tpl.id,
    date,
    startsAt: `${date}T${merged.start}:00`,
    endsAt: `${date}T${merged.end}:00`,
    title: merged.title,
    sport: merged.sport,
    venue: venueById(merged.venueId),
    capacity: merged.capacity,
    fee: merged.fee,
    host: memberById(merged.host),
    note: merged.note,
    regulars: merged.regulars || [],
    cancelled,
    cancelReason: override?.reason || null,
  };
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const d = parseVn(value);
  return !!d && toIsoDate(d) === value;
}

export function upcomingSessionsOf(sportId, weeks = 3) {
  return upcomingSessions(weeks).filter((s) => s.sport === sportId);
}

export function sessionTemplatesOf(sportId) {
  return (hub.sessionTemplates || []).filter((t) => t.sport === sportId);
}

export function findSession(id) {
  const [templateId, date] = String(id).split("@");
  const tpl = byId(hub.sessionTemplates, templateId);
  if (!tpl || !isRealDate(date)) return null;
  // Buổi chỉ tồn tại đúng thứ của mẫu -> chặn id bịa ra từ URL.
  if (parseVn(date).getUTCDay() !== tpl.weekday) return null;
  const override = (hub.sessionOverrides || []).find((o) => o.templateId === templateId && o.date === date);
  return makeSession(tpl, date, override, !!override?.cancelled);
}

export function formatFee(fee) {
  if (!fee) return "Miễn phí";
  return `${(fee / 1000).toLocaleString("vi-VN")}k / người`;
}

/* ---------------- giải đấu ---------------- */

export const tournaments = () => hub.tournaments || [];
export const tournamentBySlug = (slug) => byId(hub.tournaments, slug, "slug");

export const tournamentsOf = (sportId) => tournaments().filter((t) => t.sport === sportId);

export function tournamentSeasons() {
  return [...new Set(tournaments().map((t) => t.season))].sort().reverse();
}

/** BXH vòng tròn tính từ danh sách trận đã đá. */
export function standingsOf(tournament) {
  if (tournament.sport !== "football" || !tournament.teams?.length) return [];
  const rows = new Map(
    tournament.teams.map((id) => [id, { teamId: id, name: teamName(id), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }])
  );

  for (const m of tournament.matches || []) {
    if (m.status !== "done" || !m.home || !m.away) continue;
    const h = rows.get(m.home);
    const a = rows.get(m.away);
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += m.hs; h.ga += m.as;
    a.gf += m.as; a.ga += m.hs;
    if (m.hs > m.as) { h.w++; a.l++; h.pts += 3; }
    else if (m.hs < m.as) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }

  return [...rows.values()].sort(
    (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.name.localeCompare(y.name)
  );
}

/** Vua phá lưới của một giải (từ mảng goals trong từng trận). */
export function scorersOf(tournament) {
  const tally = new Map();
  for (const m of tournament.matches || []) {
    for (const g of m.goals || []) {
      tally.set(g.m, (tally.get(g.m) || 0) + (g.n || 1));
    }
  }
  return [...tally.entries()]
    .map(([memberId, goals]) => ({ memberId, name: memberName(memberId), team: memberById(memberId)?.team, goals }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

/** Đường đi của từng cặp DC trong giải loại trực tiếp (cầu lông): vòng xa nhất đã đá và còn sống hay chưa. */
export function entryRunsOf(tournament) {
  const entries = tournament.entries || [];
  if (entries.length === 0) return [];
  const done = (tournament.matches || []).filter((m) => m.status === "done");

  return entries.map((e) => {
    const mine = done
      .filter((m) => m.home === e.label || m.away === e.label)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const last = mine[mine.length - 1];
    const won =
      last && ((last.win === "home" && last.home === e.label) || (last.win === "away" && last.away === e.label));

    return {
      id: e.id,
      label: e.label,
      bracket: e.bracket,
      // round trong dữ liệu là "Tứ kết · Đôi nam" -> chỉ lấy tên vòng.
      round: last ? String(last.round).split(" · ")[0] : "Chưa đá",
      alive: Boolean(won),
      played: mine.length,
    };
  });
}

/** Ba dòng đầu bảng của một giải, dùng cho khối podium trên thẻ giải. Tuỳ trạng thái và môn:
 *  - giải đã xong        -> Vô địch / Á quân (dữ liệu chốt tay)
 *  - bóng đá đang đá     -> top 3 BXH tự tính từ các trận đã đá
 *  - cầu lông đang đá    -> các cặp của DC và vòng đi xa nhất
 *  Trả null khi chưa có gì để hiện -> thẻ tự ẩn khối này. */
export function podiumOf(tournament) {
  if (!tournament) return null;

  if (tournament.champion) {
    const rows = [{ rank: 1, name: tournament.champion, value: "Vô địch", lead: true }];
    if (tournament.runnerUp) rows.push({ rank: 2, name: tournament.runnerUp, value: "Á quân" });
    return { label: "Kết quả cuối", cols: ["Đội", "Thứ hạng"], ranked: true, rows };
  }

  const table = standingsOf(tournament);
  if (table.length > 0) {
    const row = (r, i) => {
      const gd = r.gf - r.ga;
      return {
        rank: i + 1,
        name: r.name,
        sub: `${r.p} trận · ${gd > 0 ? "+" : ""}${gd}`,
        value: `${r.pts} đ`,
        lead: i === 0,
      };
    };

    const rows = table.slice(0, 3).map(row);

    // Giải của TMA thì đội DC dễ nằm ngoài top 3 — vẫn ghim thêm một dòng để biết mình đứng đâu.
    const focusAt = tournament.focusTeam ? table.findIndex((r) => r.teamId === tournament.focusTeam) : -1;
    if (focusAt >= 3) {
      rows.push({ ...row(table[focusAt], focusAt), lead: false, focus: true, note: "đội của DC" });
    }

    return { label: "Bảng xếp hạng hiện tại", cols: ["Đội", "Điểm"], ranked: true, rows };
  }

  const runs = entryRunsOf(tournament);
  if (runs.length > 0) {
    return {
      label: "Các cặp của DC",
      cols: ["Cặp", "Đi tới"],
      ranked: false,
      // Nhiều cặp có thể cùng thắng trận gần nhất -> dùng nền gold nhạt, không tô gold đặc,
      // để hàng gold đặc vẫn chỉ dành cho một hàng dẫn đầu duy nhất.
      rows: runs.map((r) => ({
        name: r.label,
        sub: r.bracket,
        value: r.round,
        focus: r.alive,
        note: r.alive ? "còn trong giải" : null,
      })),
    };
  }

  return null;
}

/** Trận kế tiếp / gần nhất của một giải. */
export function splitMatches(tournament) {
  const all = [...(tournament.matches || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {
    played: all.filter((m) => m.status === "done").reverse(),
    upcoming: all.filter((m) => m.status !== "done"),
  };
}

/* ---------------- sự kiện ---------------- */

export const events = () => hub.events || [];
export const eventBySlug = (slug) => byId(hub.events, slug, "slug");

export function eventsByYear() {
  const groups = new Map();
  for (const e of events()) {
    const year = String(e.date).slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(e);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => [year, list.sort((a, b) => String(b.date).localeCompare(String(a.date)))]);
}

/* ---------------- media ---------------- */

export const media = () => hub.media || [];
export const mediaFor = (activity) => media().filter((m) => m.activity === activity);

/** Album = một hoạt động có ảnh. Tên và ngày lấy từ chính hoạt động đó. */
export function albums() {
  const out = [];
  for (const activity of [...new Set(media().map((m) => m.activity))]) {
    const items = mediaFor(activity);
    const ev = eventBySlug(activity);
    const tour = tournamentBySlug(activity);
    if (!ev && !tour) continue;
    out.push({
      activity,
      title: ev?.name || tour?.name,
      kind: ev ? ev.type : "Giải đấu",
      href: ev ? `/su-kien/${activity}` : `/the-thao/${sportSlug(tour.sport)}/giai-dau/${activity}`,
      date: ev?.date || tour?.endDate || tour?.startDate,
      sport: tour?.sport || null,
      items,
      photos: items.filter((i) => i.type === "image").length,
      videos: items.filter((i) => i.type === "video").length,
    });
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function mediaYears() {
  return [...new Set(albums().map((a) => String(a.date).slice(0, 4)))].sort().reverse();
}

/* ---------------- bảng tin ---------------- */

export function posts() {
  return [...(hub.posts || [])].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date.localeCompare(a.date));
}
export const postBySlug = (slug) => byId(hub.posts, slug, "slug");

/* ---------------- xếp hạng ---------------- */

/** Chuyên cần: đếm số buổi giao lưu đã tham gia trong năm. */
export function attendanceRanking(year = String(todayVn().getUTCFullYear())) {
  const tally = new Map();
  for (const row of hub.attendanceLog || []) {
    if (!row.date.startsWith(year)) continue;
    for (const id of row.members) {
      const cur = tally.get(id) || { memberId: id, total: 0, football: 0, badminton: 0 };
      cur.total++;
      cur[row.sport]++;
      tally.set(id, cur);
    }
  }
  return [...tally.values()]
    .map((r) => ({ ...r, name: memberById(r.memberId)?.name || r.memberId }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** Vua phá lưới cộng dồn mọi giải bóng đá có dữ liệu bàn thắng. */
export function allTimeScorers() {
  const tally = new Map();
  for (const t of tournaments()) {
    for (const s of scorersOf(t)) {
      const cur = tally.get(s.memberId) || { memberId: s.memberId, name: s.name, team: s.team, goals: 0, comps: 0 };
      cur.goals += s.goals;
      cur.comps++;
      tally.set(s.memberId, cur);
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

export function honoursByYear() {
  const groups = new Map();
  for (const h of hub.honours || []) {
    if (!groups.has(h.year)) groups.set(h.year, []);
    groups.get(h.year).push(h);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

export function honourWinnerLabel(h) {
  return h.kind === "member" ? memberById(h.winner)?.name || h.winner : h.winner;
}

/* ---------------- dòng thời gian chung ---------------- */

/** Gộp buổi giao lưu, sự kiện và trận đấu sắp tới thành một dòng "Sắp diễn ra". */
export function upcomingFeed(limit = 8, weeks = 4) {
  const items = [];

  for (const s of upcomingSessions(weeks)) {
    if (s.cancelled) continue;
    items.push({
      kind: "session",
      at: s.startsAt,
      title: s.title,
      sport: s.sport,
      place: s.venue?.name,
      href: `/the-thao/${sportSlug(s.sport)}/giao-luu#${s.id}`,
      meta: `${s.capacity} chỗ · ${formatFee(s.fee)}`,
    });
  }

  for (const e of events()) {
    if (String(e.date) < toIsoDate(todayVn())) continue;
    items.push({
      kind: "event",
      at: e.date,
      title: e.name,
      place: e.place,
      href: `/su-kien/${e.slug}`,
      meta: e.type,
    });
  }

  for (const t of tournaments()) {
    for (const m of t.matches || []) {
      if (m.status === "done" || !m.date || !inFocus(t, m)) continue;
      if (String(m.date).slice(0, 10) < toIsoDate(todayVn())) continue;
      const label = t.sport === "football" && m.home ? `${teamName(m.home)} vs ${teamName(m.away)}` : m.round || t.name;
      items.push({
        kind: "match",
        at: m.date,
        title: label,
        sport: t.sport,
        place: t.name,
        href: `/the-thao/${sportSlug(t.sport)}/giai-dau/${t.slug}`,
        meta: m.round || "Vòng đấu",
      });
    }
  }

  return items.sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(0, limit);
}

/** Giải có `focusTeam` (giải của đơn vị ngoài) chỉ đếm trận có đội của DC. */
const inFocus = (t, m) => !t.focusTeam || m.home === t.focusTeam || m.away === t.focusTeam;

/** Kết quả mới nhất trên mọi giải. */
export function recentResults(limit = 5) {
  const out = [];
  for (const t of tournaments()) {
    for (const m of t.matches || []) {
      if (m.status !== "done" || !inFocus(t, m)) continue;
      out.push({
        at: m.date,
        tournament: t.name,
        slug: t.slug,
        sport: t.sport,
        label: t.sport === "football" ? `${teamName(m.home)} ${m.hs} – ${m.as} ${teamName(m.away)}` : `${m.home} ${m.score} ${m.away}`,
        round: m.round || null,
      });
    }
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
}

// Mỗi giải dự đoán / Fantasy gom nhiều mùa trong `seasons[]` (vd FPL: 24/25, 25/26, 26/27).
// Mùa xếp mới nhất trước; "mùa đang xem mặc định" ưu tiên mùa đang chạy, rồi mùa sắp mở.
const SEASON_PRIORITY = { running: 0, upcoming: 1, finished: 2, planned: 3 };

export const predictionLeagues = () => hub.predictionLeagues || [];
export const predictionLeaguesOf = (sportId) => predictionLeagues().filter((l) => l.sport === sportId);
export const predictionLeagueBySlug = (slug) => byId(hub.predictionLeagues, slug, "slug");

export function leagueSeasons(league) {
  return [...(league?.seasons || [])];
}

export function defaultSeasonOf(league) {
  const list = leagueSeasons(league);
  if (list.length === 0) return null;
  return [...list].sort(
    (a, b) => (SEASON_PRIORITY[a.status] ?? 9) - (SEASON_PRIORITY[b.status] ?? 9) || String(b.season).localeCompare(String(a.season))
  )[0];
}

export function findSeason(league, seasonId) {
  return leagueSeasons(league).find((x) => x.id === seasonId) || null;
}

/** Tổng số mùa và số người chơi mùa mặc định — dùng cho thẻ tóm tắt. */
export function leagueSummary(league) {
  const list = leagueSeasons(league);
  const cur = defaultSeasonOf(league);
  return {
    seasons: list.length,
    current: cur,
    playable: list.filter((x) => x.href).length,
  };
}

/** Số liệu tóm tắt cho hub từng môn. */
export function sportSummary(sportId) {
  const tours = tournamentsOf(sportId);
  return {
    sessionsPerWeek: sessionTemplatesOf(sportId).length,
    running: tours.filter((t) => t.status === "running").length,
    tournaments: tours.length,
    fantasyLeagues: predictionLeaguesOf(sportId).length,
    nextSession: upcomingSessionsOf(sportId, 2).find((s) => !s.cancelled) || null,
  };
}
