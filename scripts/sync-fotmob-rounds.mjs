#!/usr/bin/env node
/**
 * Đồng bộ CHỈ SỐ TỪNG TRẬN (FotMob) cho NHỮNG CẦU THỦ ĐƯỢC PICK trong Fantasy mỗi vòng.
 *
 * KHÔNG lấy chỉ số cho toàn bộ cầu thủ của các đội — chỉ lấy đúng những cầu thủ có trong
 * đội hình Fantasy (`fantasy.squadsByRound`) của từng vòng (g1, g2, g3, r32, …). Nhờ đó trang
 * Fantasy → tab Round → bấm vào 1 cầu thủ sẽ hiện chỉ số thật của cầu thủ đó ở trận của vòng đó.
 *   vd: Virgil van Dijk – Lượt 1 (g1) lấy từ trận Netherlands vs Japan trên FotMob.
 *
 * Cách làm (giống sync-stats: FotMob bị Cloudflare/`x-mas` chặn Node fetch → dùng Playwright):
 *   1) Đọc `fantasy.squadsByRound` (KV nếu có, không thì data/db.json) → tập cầu thủ được pick
 *      theo từng vòng, kèm teamCode + oppCode (chính trận của vòng đó).
 *   2) Mở trang lịch league 77, đọc `fixtures.allMatches` → khớp (teamCode, oppCode) ↔ matchId FotMob.
 *   3) Với mỗi trận liên quan: fetch `matchDetails` NGAY TRONG page context (qua Cloudflare),
 *      chỉ trích chỉ số của ĐÚNG những cầu thủ được pick.
 *   4) Ghi vào db.roundStats.rounds[roundKey][`teamCode:tênFantasy`] = chỉ số (+ KV nếu có).
 *
 * Dùng:
 *   npm run sync-rounds
 *   $env:STATS_HEADFUL=1; npm run sync-rounds   # bật cửa sổ nếu headless bị chặn (PowerShell)
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { writeKv, readKv, KV_KEYS } from "./kv.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "db.json");

const LEAGUE_ID = process.env.FOTMOB_LEAGUE_ID || "77";
const LEAGUE_URL = `https://www.fotmob.com/leagues/${LEAGUE_ID}/matches/world-cup`;
const HEADFUL = !!process.env.STATS_HEADFUL;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function findChromium() {
  if (process.env.CHROME_EXE && existsSync(process.env.CHROME_EXE)) return process.env.CHROME_EXE;
  const base = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(base)) {
    for (const d of readdirSync(base).filter((d) => d.startsWith("chromium-")).sort().reverse()) {
      const exe = join(base, d, "chrome-win", "chrome.exe");
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

function normName(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Map tên đội FotMob -> mã đội của ta. */
function buildTeamMatcher(db) {
  const byKey = new Map();
  for (const t of db.teams || []) {
    byKey.set(normName(t.name), t.code);
    byKey.set(normName(t.code), t.code);
  }
  const ALIAS = {
    [normName("South Korea")]: "KOR",
    [normName("Korea Republic")]: "KOR",
    [normName("Bosnia & Herzegovina")]: "BIH",
    [normName("Bosnia and Herzegovina")]: "BIH",
    [normName("IR Iran")]: "IRN",
    [normName("Cote d'Ivoire")]: "CIV",
    [normName("Ivory Coast")]: "CIV",
    [normName("DR Congo")]: "COD",
    [normName("Congo DR")]: "COD",
    [normName("Cabo Verde")]: "CPV",
    [normName("Turkiye")]: "TUR",
    [normName("Türkiye")]: "TUR",
    [normName("USA")]: "USA",
    [normName("United States")]: "USA",
  };
  return (name) => byKey.get(normName(name)) || ALIAS[normName(name)] || null;
}

/** Các khóa khớp cho 1 cầu thủ (tên đầy đủ, họ, 2 từ cuối, và token đã sắp xếp). */
function playerKeys(full, last) {
  const keys = new Set();
  if (full) keys.add(normName(full));
  if (last) keys.add(normName(last));
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length >= 2) keys.add(normName(parts.slice(-2).join("")));
  if (parts.length >= 1) keys.add(normName(parts[parts.length - 1]));
  // Token đã sắp xếp: khớp tên bị đảo thứ tự họ/tên (vd Hàn Quốc: "Kim Tae-Hyeon" ↔ "Tae-Hyeon Kim").
  const tokens = parts.map(normName).filter(Boolean).sort();
  if (tokens.length >= 2) keys.add("s:" + tokens.join(""));
  return [...keys].filter(Boolean);
}

// Tên đầu (chỉ dùng làm FALLBACK khi tìm kiếm, KHÔNG đưa vào lookup) — khớp cầu thủ FotMob
// dạng mononym (vd "Gabriel" ↔ FIFA "Gabriel Magalhães"). Vì mononym đăng ký full=họ=tên đầu,
// còn cầu thủ nhiều từ KHÔNG đăng ký tên đầu, nên tránh khớp nhầm 2 người cùng tên đầu
// (vd "Julián Araujo" sẽ KHÔNG dính vào "Julián Quiñones").
const firstNameKey = (full) => normName((full || "").trim().split(/\s+/)[0] || "");

const pairKey = (a, b) => [a, b].sort().join("-");

// Đảo "2 - 0" -> "0 - 2" khi thứ tự home/away của FotMob lệch với lịch của ta.
function reverseScore(s) {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(s || "");
  return m ? `${m[2]} - ${m[1]}` : s || null;
}

// Map vòng Fantasy -> [stage, round] trong db.schedule (mới có vòng bảng; knockout bổ sung sau).
const ROUND_TO_SCHEDULE = {
  g1: ["Vòng Bảng", "Lượt 1"],
  g2: ["Vòng Bảng", "Lượt 2"],
  g3: ["Vòng Bảng", "Lượt 3"],
};

async function withRetry(fn, label, n = 3) {
  let err;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      console.warn(`! ${label} lỗi (lần ${i + 1}/${n}): ${e.message}`);
    }
  }
  throw err;
}

async function main() {
  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));

  // 1) squadsByRound: ưu tiên KV (nguồn fantasy có thể chỉ nằm ở KV), fallback db.json.
  const fantasyKv = await readKv(KV_KEYS.fantasy);
  const squadsByRound = fantasyKv?.squadsByRound || db.fantasy?.squadsByRound || {};
  const roundKeys = Object.keys(squadsByRound);
  if (!roundKeys.length) throw new Error("Không có fantasy.squadsByRound — chạy fantasy:sync trước.");

  // Gom cầu thủ được pick theo từng vòng (unique theo teamCode:tên), giữ oppCode để biết trận.
  // needed[roundKey] = Map(`teamCode:name` -> { teamCode, name, oppCode })
  const needed = {};
  let pickCount = 0;
  for (const rk of roundKeys) {
    const m = new Map();
    for (const squad of Object.values(squadsByRound[rk] || {})) {
      const all = [...(squad.starters || []), ...(squad.bench || []), squad.twelfthMan].filter(Boolean);
      for (const p of all) {
        if (!p.teamCode || !p.name) continue;
        const key = `${p.teamCode}:${p.name}`;
        if (!m.has(key)) m.set(key, { teamCode: p.teamCode, name: p.name, oppCode: p.oppCode || null });
      }
    }
    if (m.size) needed[rk] = m;
    pickCount += m.size;
  }
  console.log(`→ ${roundKeys.length} vòng, ${pickCount} lượt pick (unique theo vòng) cần lấy chỉ số.`);

  const codeOf = buildTeamMatcher(db);

  const browser = await chromium.launch({
    headless: !HEADFUL,
    executablePath: findChromium(),
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();

    console.log(`→ Mở ${LEAGUE_URL}`);
    await withRetry(() => page.goto(LEAGUE_URL, { waitUntil: "domcontentloaded", timeout: 60000 }), "Mở trang league");
    await page.waitForTimeout(4000);

    // 2) Lịch FotMob -> map cặp mã đội -> { id, started }
    const fixtures = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      if (!el) return { err: "no __NEXT_DATA__" };
      const fx = JSON.parse(el.textContent)?.props?.pageProps?.fixtures?.allMatches;
      if (!Array.isArray(fx)) return { err: "no fixtures.allMatches" };
      return {
        list: fx.map((m) => ({
          id: String(m.id),
          started: !!m?.status?.started,
          finished: !!m?.status?.finished,
          scoreStr: m?.status?.scoreStr || null,
          liveShort: m?.status?.liveTime?.short || null, // "45'", "67'", "HT"… khi đang đá
          reasonShort: m?.status?.reason?.short || null, // "FT", "AET", "Pen", "HT"… khi kết thúc/nghỉ
          utcTime: m?.status?.utcTime || null, // ISO giờ bắt đầu — dùng cho trận chưa đá
          home: m?.home?.name || "",
          away: m?.away?.name || "",
        })),
      };
    });
    if (fixtures.err) throw new Error(`Không đọc được lịch league: ${fixtures.err}`);

    const matchByPair = new Map(); // pairKey -> { id, started, finished, scoreStr, liveShort, reasonShort, homeCode, awayCode }
    for (const fx of fixtures.list) {
      const h = codeOf(fx.home);
      const a = codeOf(fx.away);
      if (h && a)
        matchByPair.set(pairKey(h, a), {
          id: fx.id,
          started: fx.started,
          finished: fx.finished,
          scoreStr: fx.scoreStr,
          liveShort: fx.liveShort,
          reasonShort: fx.reasonShort,
          utcTime: fx.utcTime,
          homeCode: h,
          awayCode: a,
        });
    }
    console.log(`→ FotMob ${fixtures.list.length} trận; khớp ${matchByPair.size} cặp mã đội.`);

    // 3) Fetch matchDetails (cache theo matchId) + trích chỉ số cầu thủ.
    const detailCache = new Map(); // matchId -> { byCode: { CODE: Map(nameKey -> playerStat) } }
    async function loadMatch(matchId) {
      if (detailCache.has(matchId)) return detailCache.get(matchId);
      const det = await withRetry(
        () =>
          page.evaluate(async (id) => {
            const r = await fetch("/api/data/matchDetails?matchId=" + id);
            if (!r.ok) return { err: "HTTP " + r.status };
            const j = await r.json();
            const lu = j?.content?.lineup;
            const ps = j?.content?.playerStats || {};
            const grabStats = (pid) => {
              const blocks = ps[String(pid)]?.stats;
              if (!Array.isArray(blocks)) return null;
              return blocks
                .map((b) => ({
                  title: b.title,
                  items: Object.entries(b.stats || {}).map(([label, v]) => ({
                    label,
                    key: v?.key ?? null,
                    value: v?.stat?.value ?? null,
                    total: v?.stat?.total ?? null,
                    type: v?.stat?.type ?? null,
                  })),
                }))
                .filter((b) => b.items.length);
            };
            const statVal = (pid, label) => {
              for (const b of ps[String(pid)]?.stats || []) if (b?.stats?.[label]) return b.stats[label].stat?.value ?? null;
              return null;
            };
            const teamPlayers = (team, started) =>
              (team?.[started ? "starters" : "subs"] || []).map((p) => {
                const ev = p.performance?.events || [];
                const minutes = statVal(p.id, "Minutes played");
                return {
                  fotmobId: p.id,
                  name: p.name,
                  lastName: p.lastName || null,
                  started,
                  played: started || minutes != null || ev.length > 0,
                  minutes: minutes ?? (started ? null : 0),
                  rating: p.performance?.rating ?? statVal(p.id, "FotMob rating") ?? null,
                  goals: ev.filter((e) => e.type === "goal").length,
                  assists: ev.filter((e) => e.type === "assist").length,
                  yellow: ev.filter((e) => e.type === "yellowCard").length,
                  red: ev.filter((e) => e.type === "redCard" || e.type === "yellowRedCard").length,
                  motm: !!p.performance?.playerOfTheMatch,
                  stats: grabStats(p.id),
                };
              });
            const teamBlock = (team) =>
              !team ? null : { name: team.name, players: [...teamPlayers(team, true), ...teamPlayers(team, false)] };

            // Bàn thắng (cả 2 đội) từ matchFacts; bỏ loạt luân lưu.
            const mfEvents = j?.content?.matchFacts?.events?.events || [];
            const goals = mfEvents
              .filter((e) => e.type === "Goal" && !e.isPenaltyShootoutEvent)
              .map((e) => ({
                min: e.time ?? e.timeStr ?? null,
                player: e.nameStr || e.fullName || e.player?.name || "",
                assist: e.assistInput || null,
                isHome: !!e.isHome,
                ownGoal: !!e.ownGoal,
                penalty: /penalt/i.test((e.goalDescriptionKey || "") + (e.goalDescription || "")),
              }));

            // Thống kê tổng quan trận ("Top stats": kiểm soát bóng, xG, sút, chuyền…).
            const topGroup = (j?.content?.stats?.Periods?.All?.stats || []).find((g) => g.title === "Top stats");
            const matchStats = (topGroup?.stats || [])
              .filter((s) => s.type !== "title")
              .map((s) => ({ title: s.title, key: s.key, type: s.type, home: s.stats?.[0] ?? null, away: s.stats?.[1] ?? null }));

            // Loạt luân lưu (nếu có): [pen nhà, pen khách] theo hướng home/away của FotMob.
            const pens = j?.header?.status?.reason?.penalties || null;

            return { home: teamBlock(lu?.homeTeam), away: teamBlock(lu?.awayTeam), goals, matchStats, pens };
          }, matchId),
        `matchDetails ${matchId}`
      );

      const byCode = {};
      for (const block of [det.home, det.away]) {
        if (!block) continue;
        const code = codeOf(block.name);
        if (!code) continue;
        const lookup = new Map();
        for (const p of block.players) for (const k of playerKeys(p.name, p.lastName)) if (!lookup.has(k)) lookup.set(k, p);
        byCode[code] = lookup;
      }
      const val = { byCode, goals: det.goals || [], matchStats: det.matchStats || [], pens: det.pens || null };
      detailCache.set(matchId, val);
      return val;
    }

    const rounds = {};
    let stored = 0,
      missMatch = 0,
      missPlayer = 0;
    for (const rk of Object.keys(needed)) {
      const out = {};
      for (const { teamCode, name, oppCode } of needed[rk].values()) {
        if (!oppCode) {
          missMatch++;
          continue;
        }
        const fx = matchByPair.get(pairKey(teamCode, oppCode));
        if (!fx || !fx.started) {
          missMatch++;
          continue;
        }
        const { byCode } = await loadMatch(fx.id);
        const lookup = byCode[teamCode];
        if (!lookup) {
          missPlayer++;
          continue;
        }
        let hit = null;
        for (const k of playerKeys(name)) if (lookup.has(k)) { hit = lookup.get(k); break; }
        // Fallback cuối: khớp tên đầu với cầu thủ mononym (vd "Gabriel" ↔ "Gabriel Magalhães").
        if (!hit) {
          const fk = firstNameKey(name);
          if (fk && lookup.has(fk)) hit = lookup.get(fk);
        }
        if (!hit) {
          missPlayer++;
          continue;
        }
        // Rút vài chỉ số top-level (cho thẻ trên đội hình): xG, xA, cứu thua — theo `key` ổn định.
        const byStatKey = (k) => {
          for (const b of hit.stats || []) for (const it of b.items || []) if (it.key === k) return it.value;
          return null;
        };
        // FotMob tính cả bù giờ → số phút có thể >90. Quy về tối đa 90 (cả top-level lẫn trong stat block).
        const capMin = (m) => (m == null ? m : Math.min(90, m));
        const cappedStats = (hit.stats || []).map((b) => ({
          ...b,
          items: b.items.map((it) =>
            it.key === "minutes_played" && it.value != null ? { ...it, value: Math.min(90, it.value) } : it
          ),
        }));
        out[`${teamCode}:${name}`] = {
          fotmobMatchId: fx.id,
          fotmobId: hit.fotmobId,
          oppCode,
          scoreStr: fx.scoreStr,
          rating: hit.rating,
          minutes: capMin(hit.minutes),
          started: hit.started,
          played: hit.played,
          goals: hit.goals,
          assists: hit.assists,
          xG: byStatKey("expected_goals"),
          xA: byStatKey("expected_assists"),
          saves: byStatKey("saves"),
          tackles: byStatKey("matchstats.headers.tackles"), // cho thẻ Tiền vệ
          sot: byStatKey("ShotsOnTarget"), // cú sút trúng đích — cho thẻ Tiền đạo
          yellow: hit.yellow,
          red: hit.red,
          motm: hit.motm,
          stats: cappedStats,
        };
        stored++;
      }
      if (Object.keys(out).length) {
        rounds[rk] = out;
        console.log(`  ✓ ${rk}: ${Object.keys(out).length} cầu thủ có chỉ số`);
      }
    }

    if (!stored) throw new Error("Không lấy được chỉ số cầu thủ nào (trận chưa đá hoặc không khớp tên?).");

    // Kết quả TẤT CẢ trận của mỗi vòng (lấy danh sách trận từ lịch, tỷ số/bàn thắng/thống kê từ FotMob).
    const matches = {};
    for (const [rk, [stage, roundName]] of Object.entries(ROUND_TO_SCHEDULE)) {
      const sched = db.schedule?.[stage]?.matches?.[roundName];
      if (!Array.isArray(sched) || !sched.length) continue;
      const list = [];
      for (const m of sched) {
        const fx = matchByPair.get(pairKey(m.homeCode, m.awayCode));
        const sameOrient = fx?.homeCode === m.homeCode; // FotMob có thể đảo home/away so với lịch
        let scoreStr = null;
        if (fx?.scoreStr) scoreStr = sameOrient ? fx.scoreStr : reverseScore(fx.scoreStr);

        // Trận đã bắt đầu -> lấy bàn thắng + thống kê (gắn mã đội theo lịch để khỏi lệch chiều).
        let goals = [];
        let matchStats = [];
        if (fx?.started) {
          try {
            const det = await loadMatch(fx.id);
            goals = (det.goals || [])
              .map((gl) => ({
                min: gl.min,
                player: gl.player,
                assist: gl.assist,
                ownGoal: gl.ownGoal,
                penalty: gl.penalty,
                teamCode: gl.isHome ? fx.homeCode : fx.awayCode,
              }))
              .sort((a, b) => (a.min ?? 0) - (b.min ?? 0));
            matchStats = (det.matchStats || []).map((s) => ({
              title: s.title,
              key: s.key,
              type: s.type,
              home: sameOrient ? s.home : s.away,
              away: sameOrient ? s.away : s.home,
            }));
          } catch (e) {
            console.warn(`  ! Không lấy được chi tiết trận ${m.homeCode}-${m.awayCode}: ${e.message}`);
          }
        }

        list.push({
          id: m.id,
          group: m.group,
          date: m.date,
          time: m.time,
          homeCode: m.homeCode,
          homeFlag: m.homeFlag,
          awayCode: m.awayCode,
          awayFlag: m.awayFlag,
          scoreStr,
          started: !!fx?.started,
          finished: !!fx?.finished,
          liveShort: fx?.liveShort || null, // phút đang đá / "HT"
          reasonShort: fx?.reasonShort || null, // "FT" / "AET" / "Pen" / "HT"
          goals,
          matchStats,
        });
      }
      matches[rk] = list;
    }

    // Vòng loại trực tiếp (r32, r16, …) chưa có trong db.schedule. Dựng danh sách trận TRỰC TIẾP
    // từ các cặp (teamCode, oppCode) mà cầu thủ được pick mang theo trong vòng đó — giống cách
    // script này đã dùng oppCode để tìm trận cho từng cầu thủ. Tỷ số/bàn thắng/thống kê lấy từ FotMob.
    const flagByCode = new Map((db.teams || []).map((t) => [t.code, t.flag]));
    // Năm giải lấy từ lịch vòng bảng (db.schedule dạng "12 tháng 6, 2026") để format ngày knockout đồng nhất.
    const tournamentYear = (() => {
      for (const stage of Object.values(db.schedule || {}))
        for (const arr of Object.values(stage?.matches || {}))
          for (const m of arr || []) {
            const y = /(\d{4})/.exec(m.date || "");
            if (y) return y[1];
          }
      return String(new Date().getFullYear());
    })();
    // "30-06" -> "30 tháng 6, 2026" (giống vòng bảng). Không khớp DD-MM thì giữ nguyên.
    const formatKnockoutDate = (d) => {
      const m = /^(\d{1,2})-(\d{1,2})$/.exec(d || "");
      return m ? `${Number(m[1])} tháng ${Number(m[2])}, ${tournamentYear}` : d || null;
    };
    // Định dạng giờ/ngày theo giờ VN từ ISO utcTime của FotMob (giống sync-football).
    const VN_TZ = "Asia/Ho_Chi_Minh";
    const fmtDateVN = (iso) =>
      new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: VN_TZ }).format(
        new Date(iso)
      );
    const fmtTimeVN = (iso) =>
      `${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: VN_TZ }).format(
        new Date(iso)
      )} (giờ VN)`;
    // Mốc thời gian để sắp xếp: ưu tiên utcTime FotMob; thiếu thì suy từ "DD-MM" (nửa đêm giờ VN).
    const epochOf = (utc, ddmm) => {
      if (utc) {
        const t = Date.parse(utc);
        if (!Number.isNaN(t)) return t;
      }
      const m = /^(\d{1,2})-(\d{1,2})$/.exec(ddmm || "");
      if (m) {
        const t = Date.parse(`${tournamentYear}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00+07:00`);
        if (!Number.isNaN(t)) return t;
      }
      return Number.MAX_SAFE_INTEGER;
    };
    for (const rk of Object.keys(squadsByRound)) {
      if (ROUND_TO_SCHEDULE[rk] || matches[rk]) continue; // vòng bảng đã xử lý ở trên
      const pairs = new Map(); // pairKey -> { a, b, date }
      for (const squad of Object.values(squadsByRound[rk] || {})) {
        const all = [...(squad.starters || []), ...(squad.bench || []), squad.twelfthMan].filter(Boolean);
        for (const p of all) {
          if (!p.teamCode || !p.oppCode) continue;
          const pk = pairKey(p.teamCode, p.oppCode);
          if (!pairs.has(pk)) pairs.set(pk, { a: p.teamCode, b: p.oppCode, date: p.matchDate || null });
        }
      }
      if (!pairs.size) continue;
      const list = [];
      for (const { a, b, date } of pairs.values()) {
        const fx = matchByPair.get(pairKey(a, b));
        // Hướng nhà/khách theo FotMob (nếu khớp); chưa khớp thì tạm dùng đội của cầu thủ làm nhà.
        const homeCode = fx?.homeCode || a;
        const awayCode = fx?.awayCode || b;
        let goals = [];
        let matchStats = [];
        let penStr = null;
        if (fx?.started) {
          try {
            const det = await loadMatch(fx.id);
            goals = (det.goals || [])
              .map((gl) => ({
                min: gl.min,
                player: gl.player,
                assist: gl.assist,
                ownGoal: gl.ownGoal,
                penalty: gl.penalty,
                teamCode: gl.isHome ? homeCode : awayCode,
              }))
              .sort((x, y) => (x.min ?? 0) - (y.min ?? 0));
            matchStats = det.matchStats || []; // home/away đã theo hướng FotMob -> khỏi đảo
            // Tỷ số luân lưu "nhà - khách" (cùng hướng với scoreStr/homeCode) khi trận phân thắng bại bằng pen.
            if (Array.isArray(det.pens) && det.pens.length === 2) penStr = `${det.pens[0]} - ${det.pens[1]}`;
          } catch (e) {
            console.warn(`  ! Không lấy được chi tiết trận ${homeCode}-${awayCode}: ${e.message}`);
          }
        }
        list.push({
          id: fx?.id || `${homeCode}-${awayCode}`,
          group: null, // knockout không có bảng
          date, // tạm giữ "DD-MM" để sort, format lại bên dưới
          time: null, // điền giờ VN bên dưới (cho trận chưa đá)
          _utc: fx?.utcTime || null,
          homeCode,
          homeFlag: flagByCode.get(homeCode) || "",
          awayCode,
          awayFlag: flagByCode.get(awayCode) || "",
          scoreStr: fx?.scoreStr || null,
          penStr, // tỷ số luân lưu (null nếu không có)
          started: !!fx?.started,
          finished: !!fx?.finished,
          liveShort: fx?.liveShort || null,
          reasonShort: fx?.reasonShort || null,
          goals,
          matchStats,
        });
      }
      list.sort(
        (x, y) => epochOf(x._utc, x.date) - epochOf(y._utc, y.date) || x.homeCode.localeCompare(y.homeCode)
      );
      for (const it of list) {
        // Ngày + giờ kickoff theo giờ VN từ FotMob; thiếu utcTime thì fallback ngày từ pick (không có giờ).
        it.date = it._utc ? fmtDateVN(it._utc) : formatKnockoutDate(it.date);
        it.time = it._utc ? fmtTimeVN(it._utc) : null;
        delete it._utc;
      }
      matches[rk] = list;
      console.log(`  ✓ ${rk}: ${list.length} trận (dựng từ pick).`);
    }

    db.roundStats = {
      source: "FotMob",
      leagueId: Number(LEAGUE_ID),
      leagueName: "FIFA World Cup",
      sourceUrl: LEAGUE_URL,
      updated: new Date().toISOString(),
      playerImg: "https://images.fotmob.com/image_resources/playerimages/{id}.png",
      rounds,
      matches,
    };
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    console.log(`✓ Đã ghi roundStats: ${stored} cầu thủ / ${Object.keys(rounds).length} vòng (bỏ qua ${missMatch} chưa đá, ${missPlayer} không khớp).`);

    if (await writeKv(KV_KEYS.roundStats, db.roundStats)) console.log("✓ Đã ghi roundStats lên KV (wc26:roundStats).");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
