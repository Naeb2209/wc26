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

/** Sinh buổi từ mẫu lặp hằng tuần cho các ngày trong [fromDay, toDay) tính từ hôm nay. */
function sessionsBetween(fromDay, toDay) {
  const start = todayVn();
  const out = [];

  for (const tpl of hub.sessionTemplates || []) {
    for (let i = fromDay; i < toDay; i++) {
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

/** Buổi sắp tới, từ hôm nay đến hết `weeks` tuần. */
export function upcomingSessions(weeks = 3) {
  return sessionsBetween(0, weeks * 7);
}

/** Buổi đã đá trong `weeks` tuần vừa rồi, mới nhất lên trước. */
export function pastSessions(weeks = 4) {
  return sessionsBetween(-weeks * 7, 0).reverse();
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
    splitTeams: merged.splitTeams || 0,
    // Ban tổ chức chốt số đội cho riêng ngày này -> giữ đúng; không thì drawTeams tự tính theo số người.
    splitTeamsFixed: !!override?.splitTeams,
    teams: override?.teams || [],
    matches: override?.matches || [],
    pots: override?.pots || [],
    split: merged.split || null,
    cancelled,
    cancelReason: override?.reason || null,
  };
}

/* Kết quả một buổi giao lưu: buổi chia 2–3 đội, đá vòng tròn với nhau.
   Chỉ lưu từng trận (a–b, tỉ số, người ghi) -> bảng xếp và hiệu số tính ra từ đó,
   không có con số nào phải nhập hai lần. */
export function sessionResult(session) {
  const teams = session?.teams || [];
  const matches = (session?.matches || []).filter((m) => Number.isFinite(m.as) && Number.isFinite(m.bs));
  if (teams.length < 2 || matches.length === 0) return null;

  const rows = new Map(
    teams.map((t) => [t.id, { ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }])
  );

  for (const m of matches) {
    const home = rows.get(m.a);
    const away = rows.get(m.b);
    if (!home || !away) continue;
    for (const [me, mine, theirs] of [
      [home, m.as, m.bs],
      [away, m.bs, m.as],
    ]) {
      me.played += 1;
      me.gf += mine;
      me.ga += theirs;
      me.gd = me.gf - me.ga;
      if (mine > theirs) (me.won += 1), (me.pts += 3);
      else if (mine === theirs) (me.drawn += 1), (me.pts += 1);
      else me.lost += 1;
    }
  }

  const table = [...rows.values()].sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);

  // Người ghi bàn gộp cả buổi, kèm đội để biết ai ghi cho bên nào.
  const teamOfMember = new Map();
  for (const t of teams) for (const id of t.members || []) teamOfMember.set(id, t.id);

  // Bàn khai `t` (id đội ghi) thì theo đúng `t` — dùng khi tên người ghi không khớp tên trong
  // đội (nickname trong pot khác tên gọi lúc ghi kết quả). Không khai thì tra theo đội hình.
  const teamOfGoal = (g) => g.t || teamOfMember.get(g.m) || null;

  const tally = new Map();
  const goalTeam = new Map();
  for (const m of matches) {
    for (const g of m.goals || []) {
      // Bàn phản lưới (og) cộng cho đội được hưởng nhưng không phải bàn của người đá phản.
      if (g.og) continue;
      tally.set(g.m, (tally.get(g.m) || 0) + (g.n || 1));
      if (!goalTeam.has(g.m) && teamOfGoal(g)) goalTeam.set(g.m, teamOfGoal(g));
    }
  }
  const scorers = [...tally.entries()]
    .map(([id, goals]) => ({ id, goals, teamId: teamOfMember.get(id) || goalTeam.get(id) || null }))
    .sort((x, y) => y.goals - x.goals || memberName(x.id).localeCompare(memberName(y.id)));

  // Ghi bàn tách về hai bên của từng trận -> phần chi tiết đọc được "ai ghi cho ai".
  // Bàn của người không thuộc đội nào trong trận (khách đá ké) gom về bên ghi nhiều hơn là sai,
  // nên để riêng ở "others" thay vì gán bừa.
  const detailed = matches.map((m) => {
    const side = (teamId) =>
      (m.goals || [])
        .filter((g) => teamOfGoal(g) === teamId)
        .map((g) => ({ id: g.m, goals: g.n || 1, og: !!g.og }))
        .sort((x, y) => y.goals - x.goals);
    const known = new Set([...side(m.a), ...side(m.b)].map((g) => g.id));
    return {
      ...m,
      goalsA: side(m.a),
      goalsB: side(m.b),
      others: (m.goals || []).filter((g) => !known.has(g.m)).map((g) => ({ id: g.m, goals: g.n || 1 })),
    };
  });

  // Đội hình kèm số bàn của từng người -> khối "đội hình" không phải tra ngược bảng ghi bàn.
  const lineups = table.map((t) => ({
    ...t,
    lineup: (t.members || [])
      .map((id) => ({ id, goals: tally.get(id) || 0 }))
      .sort((x, y) => y.goals - x.goals || memberName(x.id).localeCompare(memberName(y.id))),
  }));

  return { table: lineups, matches: detailed, scorers, goals: table.reduce((n, r) => n + r.gf, 0) };
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const d = parseVn(value);
  return !!d && toIsoDate(d) === value;
}

/** Nhãn "bàn" cho bóng đá, "điểm" cho các môn tính điểm như cầu lông. */
export const scoreWord = (sportId) => (sportId === "football" ? "bàn" : "điểm");

export function upcomingSessionsOf(sportId, weeks = 3) {
  return upcomingSessions(weeks).filter((s) => s.sport === sportId);
}

export function pastSessionsOf(sportId, weeks = 4) {
  return pastSessions(weeks).filter((s) => s.sport === sportId);
}

/* ---------------- bốc thăm chia đội ---------------- */

/* Buổi bóng đá chốt danh sách và bốc thăm chia đội trước giờ đá 2 tiếng.
   Sau mốc này điểm danh khoá lại -> đội đã chia không đổi nữa. */
export const SPLIT_LEAD_MS = 2 * 3600 * 1000;

/** Mốc chia đội của một buổi, tính bằng mili giây. Ngày giờ trong data là giờ VN.
    Buổi khai `split` ("16:30") thì lấy đúng giờ đó, không thì lùi SPLIT_LEAD_MS từ giờ đá. */
export function splitAt(session) {
  if (session?.split && session?.date) {
    const fixed = Date.parse(`${session.date}T${session.split}:00+07:00`);
    if (!Number.isNaN(fixed)) return fixed;
  }
  const t = Date.parse(`${session?.startsAt}+07:00`);
  return Number.isNaN(t) ? null : t - SPLIT_LEAD_MS;
}

/** Mốc chia đội dạng chuỗi giờ VN, để fmtDate/fmtTime in ra như mọi mốc khác. */
export function splitAtVn(session) {
  if (session?.split && session?.date) return `${session.date}T${session.split}:00`;
  const d = parseVn(session?.startsAt);
  if (!d) return "";
  const x = new Date(d.getTime() - SPLIT_LEAD_MS);
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}T${p(x.getUTCHours())}:${p(
    x.getUTCMinutes()
  )}:00`;
}

/** Chỉ bóng đá mới bốc thăm chia đội; cầu lông vẫn tự ghép cặp ngoài sân. */
export const splitsTeams = (session) => session?.sport === "football" && (session?.splitTeams || 0) >= 2;

const DRAW_TEAMS = {
  2: [
    { id: "sang", name: "Áo sáng", color: "light" },
    { id: "toi", name: "Áo tối", color: "dark" },
  ],
  3: [
    { id: "do", name: "Đỏ", color: "red" },
    { id: "xanh", name: "Xanh", color: "blue" },
    { id: "vang", name: "Vàng", color: "yellow" },
  ],
};

/* Nguồn ngẫu nhiên: drand — beacon ngẫu nhiên công khai, mỗi 3 giây ra một "round".
   Lấy đúng round được công bố ngay tại mốc chốt: trước giờ đó không ai biết nó là số mấy,
   sau giờ đó ai tra cũng ra cùng một số. Nhờ vậy kết quả bốc thăm vừa không đoán trước
   được, vừa giống nhau ở mọi máy, lại có link để bất kỳ ai cũng kiểm chứng lại được. */
export const DRAND = {
  chain: "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971",
  genesis: 1692803367,
  period: 3,
  hosts: ["https://api.drand.sh", "https://api2.drand.sh", "https://drand.cloudflare.com"],
};

/** Round của drand được công bố ngay sau mốc `at` (mili giây). */
export const drandRound = (at) => Math.ceil((at / 1000 - DRAND.genesis) / DRAND.period) + 1;

export const drandUrl = (round, host = DRAND.hosts[0]) => `${host}/${DRAND.chain}/public/${round}`;

// sfc32, nạp từ 32 byte randomness của drand.
function fromHex(hex) {
  let st = [0, 8, 16, 24].map((i) => parseInt(hex.slice(i, i + 8), 16) >>> 0);
  return () => {
    let [x, y, z, w] = st;
    const t = (((x + y) >>> 0) + w) >>> 0;
    w = (w + 1) >>> 0;
    x = y ^ (y >>> 9);
    y = (z + (z << 3)) >>> 0;
    z = ((z << 21) | (z >>> 11)) >>> 0;
    z = (z + t) >>> 0;
    st = [x, y, z, w];
    return (t >>> 0) / 4294967296;
  };
}

// Dự phòng khi không gọi được drand: seed từ chính buổi + danh sách đi. Vẫn giống nhau ở
// mọi máy, chỉ kém ở chỗ ai đọc code thì tính trước được.
function fromKey(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const chunked = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const seeded = (key, hex) => (hex && /^[0-9a-f]{32,}$/i.test(hex) ? fromHex(hex) : fromKey(key));

function shuffled(list, rnd) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Bốc thăm chia đội theo POT.

   Xếp người đi theo trình độ (tier 1 cứng nhất) rồi cắt thành từng POT đúng bằng số đội:
   POT 1 là nhóm cứng nhất, POT 2 nhóm kế... Mỗi POT quay random rồi rải mỗi đội một người,
   nên đội nào cũng có đúng một người ở mỗi mức trình độ — random nhưng không lệch kèo.
   POT cuối lẻ người thì ai dư về đội đang ít người nhất.

   Số đội: override của ngày đó khai `splitTeams` thì theo đúng; không thì tự tính theo số
   người — trên THREE_TEAMS_FROM người thì 3 đội, còn lại 2 đội. */
export const THREE_TEAMS_FROM = 16;

export function teamCountFor(session, players) {
  if (session?.splitTeamsFixed) return Math.min(3, Math.max(2, session.splitTeams));
  return players > THREE_TEAMS_FROM ? 3 : 2;
}

export function drawTeams(session, going = [], seedHex = null) {
  if (!splitsTeams(session)) return null;

  // Buổi khai sẵn pots[] thì dùng đúng pot đó — ban tổ chức tự xếp, khỏi suy từ tier.
  // Mỗi phần tử là memberId hoặc thẳng cái tên; tên lạ vẫn hiện đúng như khai.
  const fixed = (session.pots || []).filter((pot) => Array.isArray(pot) && pot.length > 0);

  const ranked = fixed.length
    ? fixed.flat()
    : [...going].sort(
        (a, b) => (memberById(a)?.tier || 9) - (memberById(b)?.tier || 9) || String(a).localeCompare(String(b))
      );

  const count = teamCountFor(session, ranked.length);
  const meta = DRAW_TEAMS[count];
  if (ranked.length < count) return null;

  const rnd = seeded(`${session.id}|${ranked.join(",")}`, seedHex);
  const teams = meta.map((t) => ({ ...t, members: [] }));
  const pots = [];
  // picks: thứ tự bốc thực tế, dùng để chạy hiệu ứng theo đúng một lịch ở mọi máy.
  const picks = [];

  const source = fixed.length ? fixed : chunked(ranked, count);
  for (const pot of source) {
    pots.push(pot);
    const picked = shuffled(pot, rnd);

    if (picked.length === count) {
      picked.forEach((id, k) => {
        teams[k].members.push(id);
        picks.push({ pot: pots.length - 1, id, teamId: teams[k].id });
      });
      continue;
    }
    // POT lẻ: rải vào đội ít người nhất, hoà thì quay tiếp cho khỏi luôn thiên vị đội đầu.
    for (const id of picked) {
      const fewest = Math.min(...teams.map((t) => t.members.length));
      const candidates = shuffled(
        teams.filter((t) => t.members.length === fewest),
        rnd
      );
      candidates[0].members.push(id);
      picks.push({ pot: pots.length - 1, id, teamId: candidates[0].id });
    }
  }

  // Người cuối của mỗi POT không còn gì để chọn -> hiện thẳng, khỏi quay.
  picks.forEach((p, k) => {
    p.auto = !picks.slice(k + 1).some((q) => q.pot === p.pot);
  });

  return { teams, pots, count, picks };
}

/* Vua farm gà: ghi nhiều nhất ở các buổi giao lưu nội bộ trong một năm.

   Chỉ đọc sessionOverrides vì đó là chỗ duy nhất có kết quả — buổi sinh ra từ mẫu lặp
   mà không khai matches thì coi như chưa có số liệu. Đếm cả số buổi mỗi người ghi được
   để phân biệt người đều đặn với người có đúng một buổi bùng nổ. */
/* Mốc bắt đầu tính thống kê sân nhà của một môn (`statsFrom` trong sports[]).

   Vua farm gà và Giữ chuỗi đều là bảng nội bộ: khi nhóm quyết định tính lại từ đầu,
   khai một ngày ở đây là hai bảng cùng bỏ qua mọi buổi trước đó — không phải xoá sổ
   điểm danh cũ, nên tab Xếp hạng và lịch sử buổi vẫn còn nguyên. */
export const statsFrom = (sportId) => sportById(sportId)?.statsFrom || null;

const afterStatsFrom = (sportId, date) => {
  const from = statsFrom(sportId);
  return !from || String(date) >= from;
};

export function sessionScorers(sportId, year) {
  const goals = new Map();
  const sessions = new Map();
  let playedSessions = 0;
  let totalGoals = 0;

  for (const o of hub.sessionOverrides || []) {
    const tpl = byId(hub.sessionTemplates, o.templateId);
    if (!tpl || tpl.sport !== sportId) continue;
    if (!afterStatsFrom(sportId, o.date)) continue;
    if (year && !String(o.date).startsWith(`${year}-`)) continue;

    const matches = (o.matches || []).filter((m) => Number.isFinite(m.as) && Number.isFinite(m.bs));
    if (matches.length === 0) continue;
    playedSessions += 1;

    const here = new Set();
    for (const m of matches) {
      for (const g of m.goals || []) {
        if (g.og) continue;
        const n = g.n || 1;
        goals.set(g.m, (goals.get(g.m) || 0) + n);
        here.add(g.m);
        totalGoals += n;
      }
    }
    for (const id of here) sessions.set(id, (sessions.get(id) || 0) + 1);
  }

  const rows = [...goals.entries()]
    .map(([id, n]) => ({ id, goals: n, sessions: sessions.get(id) || 0 }))
    .sort((x, y) => y.goals - x.goals || y.sessions - x.sessions || memberName(x.id).localeCompare(memberName(y.id)));

  return { year, rows, sessions: playedSessions, goals: totalGoals };
}

/** Các năm đã có kết quả buổi giao lưu của môn này, mới nhất trước. */
export function sessionYears(sportId) {
  const years = new Set();
  for (const o of hub.sessionOverrides || []) {
    const tpl = byId(hub.sessionTemplates, o.templateId);
    if (!tpl || tpl.sport !== sportId) continue;
    if (!afterStatsFrom(sportId, o.date)) continue;
    if ((o.matches || []).length === 0) continue;
    years.add(String(o.date).slice(0, 4));
  }
  return [...years].sort().reverse();
}

/* Chuỗi giữ đều: mấy buổi gần nhất liên tiếp một người có mặt.

   Đếm trên attendanceLog — sổ điểm danh đã chốt sau buổi — chứ không phải RSVP đang mở,
   nên chuỗi chỉ đổi khi buổi đã đá xong và được ghi sổ, không ai giữ chuỗi bằng cách
   bấm "đi" rồi ở nhà. Vắng một buổi là chuỗi về 0; `best` giữ lại kỷ lục cũ để còn
   cái mà đòi lại.

   Buổi huỷ (mưa, sân sửa) KHÔNG phải một mắt xích: không ai có cơ hội ra sân thì
   không ai đáng bị đứt chuỗi. Tuần đó bị bỏ qua, chuỗi nối thẳng qua — nên dòng sổ
   rỗng người và buổi có `cancelled: true` trong sessionOverrides đều không được tính. */
export function attendanceStreaks(sportId) {
  // Tuần đã khai huỷ: tra theo ngày để loại luôn khỏi dãy mắt xích.
  const cancelled = new Set(
    (hub.sessionOverrides || [])
      .filter((o) => o.cancelled && byId(hub.sessionTemplates, o.templateId)?.sport === sportId)
      .map((o) => o.date)
  );

  const from = statsFrom(sportId);
  const log = (hub.attendanceLog || [])
    .filter((r) => r.sport === sportId && isRealDate(r.date) && afterStatsFrom(sportId, r.date))
    .filter((r) => (r.members || []).length > 0 && !cancelled.has(r.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Mới đặt mốc tính lại thì chưa có buổi nào -> vẫn trả về khối rỗng kèm mốc, để trang
  // nói được "bắt đầu từ hôm nay" thay vì giấu luôn bảng đi như thể không có tính năng.
  if (log.length === 0) return from ? { rows: [], sessions: 0, last: null, from, skipped: [], holders: 0 } : null;

  // Buổi mới nhất đứng đầu -> chuỗi hiện tại là số phần tử đầu dãy có tên mình.
  const sets = log.map((r) => new Set(r.members || []));
  const ids = new Set(log.flatMap((r) => r.members || []));

  const rows = [...ids]
    .map((id) => {
      let streak = 0;
      while (streak < sets.length && sets[streak].has(id)) streak += 1;

      let best = 0;
      let run = 0;
      let total = 0;
      for (const s of sets) {
        if (!s.has(id)) {
          run = 0;
          continue;
        }
        run += 1;
        total += 1;
        if (run > best) best = run;
      }

      return { id, streak, best, total, since: streak > 0 ? log[streak - 1].date : null };
    })
    .sort(
      (x, y) =>
        y.streak - x.streak || y.best - x.best || y.total - x.total || memberName(x.id).localeCompare(memberName(y.id))
    );

  // Tuần huỷ nằm sau buổi ghi sổ gần nhất: chuỗi không đứt nhưng người đọc vẫn thắc mắc
  // "sao tuần rồi không thấy đâu" -> trả về để khối giao lưu nói rõ lý do.
  const today = toIsoDate(todayVn());
  const skipped = (hub.sessionOverrides || [])
    .filter(
      (o) =>
        o.cancelled &&
        byId(hub.sessionTemplates, o.templateId)?.sport === sportId &&
        o.date > log[0].date &&
        o.date <= today
    )
    .map((o) => ({ date: o.date, reason: o.reason || null }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    rows,
    sessions: sets.length,
    last: log[0].date,
    from,
    skipped,
    holders: rows.filter((r) => r.streak >= 2).length,
  };
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

// Thứ tự hiển thị giải: đang diễn ra -> sắp diễn ra -> đã kết thúc, trong mỗi nhóm thì mới nhất trước.
// dc42.json không giữ thứ tự nào cả, nên mọi chỗ liệt kê giải phải sort qua đây,
// không thì cắt `slice()` sẽ ra một giải cũ ngẫu nhiên.
const TOURNAMENT_ORDER = { running: 0, upcoming: 1, finished: 2 };

export function sortTournaments(list) {
  return [...list].sort(
    (a, b) =>
      (TOURNAMENT_ORDER[a.status] ?? 3) - (TOURNAMENT_ORDER[b.status] ?? 3) ||
      // Mùa gõ tay có thể không biết ngày khai mạc -> rơi về năm, không thì "undefined" lại đứng đầu.
      String(b.startDate || b.season).localeCompare(String(a.startDate || a.season))
  );
}

export const sortedTournamentsOf = (sportId) => sortTournaments(tournamentsOf(sportId));

export function tournamentSeasons() {
  return [...new Set(tournaments().map((t) => t.season))].sort().reverse();
}

/* Giải nhiều mùa: mỗi mùa vẫn là một phần tử `tournaments[]` riêng (BXH, lịch, roster tính theo mùa),
   `league` là sợi dây gom chúng lại thành một giải có bộ chọn mùa. */

export const leagues = () => hub.leagues || [];
export const leagueById = (id) => byId(hub.leagues, id);

/** Mọi mùa của một giải, mùa mới nhất trước. */
export const leagueSeasonsOf = (leagueId) =>
  tournaments()
    .filter((t) => t.league === leagueId)
    .sort((a, b) => String(b.season).localeCompare(String(a.season)));

/** Các mùa cùng giải với `tournament` — mảng rỗng nếu giải chỉ có một mùa (không cần bộ chọn mùa). */
export function siblingSeasonsOf(tournament) {
  if (!tournament?.league) return [];
  const list = leagueSeasonsOf(tournament.league);
  return list.length > 1 ? list : [];
}

/** Gộp một danh sách giải theo `league`: giải nhiều mùa chỉ còn một phần tử.
 *  `current` là mùa đại diện — mùa đầu tiên còn sống sau bộ lọc, nên thẻ luôn hiện mùa
 *  mà người xem đang lọc tới. `seasons` liệt kê đủ mọi mùa để bộ chọn mùa không bị hụt. */
export function groupByLeague(list) {
  const out = [];
  const seen = new Set();

  for (const t of list) {
    if (!t.league) {
      out.push({ league: null, current: t, seasons: [] });
      continue;
    }
    if (seen.has(t.league)) continue;
    seen.add(t.league);
    out.push({ league: leagueById(t.league), current: t, seasons: leagueSeasonsOf(t.league) });
  }

  return out;
}

/** Đội của DC trong một giải của đơn vị ngoài. Có giải DC góp hai đội (DG7 League Cup)
 *  nên khai bằng `focusTeams[]`; `focusTeam` một đội vẫn chạy như cũ. */
export const focusTeamsOf = (t) => t?.focusTeams || (t?.focusTeam ? [t.focusTeam] : []);

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

/** Đội hình một mùa. Số áo đổi theo từng mùa nên `roster[]` nhận hai dạng:
 *  - `"m29"`                          -> số áo lấy từ `number` của member (số mặc định)
 *  - `{ "m": "m29", "number": "5" }`  -> số áo riêng của mùa đó, đè lên số mặc định
 *  Sắp theo số bàn giảm dần, cùng số bàn thì theo số áo. */
export function rosterOf(tournament) {
  const goals = new Map(scorersOf(tournament).map((s) => [s.memberId, s.goals]));

  return (tournament.roster || [])
    .map((entry) => {
      const flat = typeof entry === "string";
      const id = flat ? entry : entry.m;
      const member = memberById(id);
      const number = (flat ? null : entry.number) ?? member?.number ?? null;
      return { id, member, number, goals: goals.get(id) || 0 };
    })
    .sort((a, b) => b.goals - a.goals || Number(a.number || 999) - Number(b.number || 999));
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
    // Thẻ giải chỉ nói số trận và điểm — hiệu số để dành cho BXH đầy đủ ở trang giải.
    const row = (r, i) => ({
      rank: i + 1,
      name: r.name,
      sub: `${r.p} trận`,
      value: `${r.pts} đ`,
      lead: i === 0,
    });

    const rows = table.slice(0, 3).map(row);

    // Giải của đơn vị ngoài thì đội DC dễ nằm ngoài top 3 — ghim thêm một dòng cho mỗi đội
    // để biết mình đứng đâu, theo đúng thứ tự bảng.
    for (const teamId of focusTeamsOf(tournament)) {
      const at = table.findIndex((r) => r.teamId === teamId);
      if (at >= 3) rows.push({ ...row(table[at], at), lead: false, focus: true, note: "đội của DC" });
    }
    rows.sort((a, b) => a.rank - b.rank);

    return {
      label: tournament.status === "finished" ? "Bảng xếp hạng cuối" : "Bảng xếp hạng hiện tại",
      cols: ["Đội", "Điểm"],
      ranked: true,
      rows,
    };
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

/** Ảnh bìa của một hoạt động: tấm ảnh thật đầu tiên trong album.
 *  Chưa góp ảnh thì trả null -> thẻ và trang mùa tự bỏ khối bìa, không để ô trống. */
export const coverOf = (activity) =>
  mediaFor(activity).find((m) => m.type === "image" && m.url) || null;

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

/** Ảnh nền cho hero tối của một tab: ảnh thật của album mới nhất thoả `pick`.
 *  `nth` chọn tấm thứ mấy trong album (vòng lại nếu album ít ảnh) để các tab cùng lấy một
 *  album không ra cùng một tấm. Không album nào có ảnh thì trả null -> hero dùng nền mực ánh vàng. */
export function heroImage(pick = () => true, nth = 0) {
  for (const a of albums().filter(pick)) {
    const imgs = a.items.filter((i) => i.type === "image" && i.url);
    if (imgs.length > 0) return imgs[nth % imgs.length].url;
  }
  return null;
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

/** Chuyên cần: đếm số buổi giao lưu đã tham gia trong năm.
    Môn nào đã đặt `statsFrom` thì chỉ đếm từ mốc đó, để bảng này nói cùng một con số
    với Giữ chuỗi và Vua farm gà ở tab Giao lưu. */
export function attendanceRanking(year = String(todayVn().getUTCFullYear())) {
  const tally = new Map();
  for (const row of hub.attendanceLog || []) {
    if (!row.date.startsWith(year)) continue;
    if (!afterStatsFrom(row.sport, row.date)) continue;
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

/** Vua phá lưới cộng dồn mọi giải bóng đá có dữ liệu bàn thắng.
    `seasons[]` giữ số bàn từng giải (mới nhất trước) để bấm vào xem chi tiết. */
export function allTimeScorers() {
  const tally = new Map();
  for (const t of tournaments()) {
    for (const s of scorersOf(t)) {
      const cur = tally.get(s.memberId) || { memberId: s.memberId, name: s.name, team: s.team, goals: 0, comps: 0, seasons: [] };
      cur.goals += s.goals;
      cur.comps++;
      cur.seasons.push({ slug: t.slug, name: t.name, sport: t.sport, season: t.season, goals: s.goals });
      tally.set(s.memberId, cur);
    }
  }
  for (const cur of tally.values()) {
    cur.seasons.sort((a, b) => String(b.season).localeCompare(String(a.season)) || b.goals - a.goals);
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

/* Nhãn người/đội thắng của một danh hiệu.

   `winners[]` dành cho giải đồng đội của mấy người ngang hàng nhau — không ai bị nhấc
   lên làm đại diện rồi phần còn lại dồn vào `detail`. Phần tử là id thành viên, hoặc
   tên viết tay cho người chưa có trong members[]. */
export function honourWinnerLabel(h) {
  if (Array.isArray(h.winners) && h.winners.length > 0) {
    return h.winners.map((w) => memberById(w)?.name || w).join(" · ");
  }
  return h.kind === "member" ? memberById(h.winner)?.name || h.winner : h.winner;
}

/* ---------------- dòng thời gian chung ---------------- */

/** Gộp buổi giao lưu, sự kiện và trận đấu sắp tới thành một dòng "Sắp diễn ra". */
export function upcomingFeed(limit = 8, weeks = 4) {
  const items = [];

  // Kèo hằng tuần lặp lại y hệt nhau, bày cả bốn tuần thì feed toàn một buổi nhân bản.
  // Mỗi môn chỉ lấy buổi gần nhất; muốn xem lịch dài thì vào tab Giao lưu của môn.
  const seen = new Set();
  for (const s of upcomingSessions(weeks)) {
    if (s.cancelled || seen.has(s.sport)) continue;
    seen.add(s.sport);
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

/** Giải của đơn vị ngoài chỉ đếm trận có đội của DC. */
const inFocus = (t, m) => {
  const focus = focusTeamsOf(t);
  return focus.length === 0 || focus.includes(m.home) || focus.includes(m.away);
};

/** Kết quả mới nhất trên mọi giải. */
export function recentResults(limit = 5) {
  const out = [];
  for (const t of tournaments()) {
    for (const m of t.matches || []) {
      // Mùa cũ gõ tay có thể không biết ngày từng trận -> không xếp được vào dòng thời gian.
      if (m.status !== "done" || !m.date || !inFocus(t, m)) continue;
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
    // Đếm theo giải, không theo mùa -> khớp số thẻ thấy ở trang Giải đấu.
    tournaments: groupByLeague(tours).length,
    fantasyLeagues: predictionLeaguesOf(sportId).length,
    nextSession: upcomingSessionsOf(sportId, 2).find((s) => !s.cancelled) || null,
  };
}
