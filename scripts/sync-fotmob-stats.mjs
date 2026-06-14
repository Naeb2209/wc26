#!/usr/bin/env node
/**
 * Đồng bộ THỐNG KÊ CÁ NHÂN World Cup từ FotMob (league 77) bằng Playwright.
 *
 * FotMob bị Cloudflare/`x-mas` header bảo vệ → Node fetch/curl bị chặn ở tầng TLS.
 * Cách chạy được là mở trang thật bằng Playwright rồi:
 *   1) đọc danh mục thống kê nhúng trong __NEXT_DATA__ (stats.players),
 *   2) fetch full bảng xếp hạng từng hạng mục NGAY TRONG page context (in-page fetch
 *      mới qua được Cloudflare; node fetch ngoài trang vẫn bị chặn).
 *
 * Dùng:
 *   npm run sync-stats                 # headless, ghi data/db.json -> playerStats
 *   $env:STATS_HEADFUL=1; npm run sync-stats   # bật cửa sổ nếu headless bị chặn (PowerShell)
 *
 * Không cần đăng nhập (trang stats là public). Dùng lại binary Chromium mà
 * `npx playwright install chromium` đã tải (tự dò trong ms-playwright).
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "db.json");

const LEAGUE_ID = process.env.FOTMOB_LEAGUE_ID || "77";
const STATS_URL = `https://www.fotmob.com/leagues/${LEAGUE_ID}/stats/world-cup/players`;
const TOP_N = Number(process.env.STATS_TOP_N || 20);
const HEADFUL = !!process.env.STATS_HEADFUL;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Các hạng mục cần đồng bộ — gom theo nhóm như trang FotMob.
 * `name` khớp đúng StatName của FotMob; `label`/`unit` là nhãn tiếng Việt hiển thị.
 * `dec` = số chữ số thập phân khi hiển thị (0 = số nguyên).
 */
const GROUPS = [
  {
    key: "top",
    label: "Thống kê hàng đầu",
    icon: "trophy",
    cats: [
      { name: "goals", label: "Vua phá lưới", unit: "bàn", dec: 0 },
      { name: "goal_assist", label: "Kiến tạo", unit: "kiến tạo", dec: 0 },
      { name: "_goals_and_goal_assist", label: "Bàn thắng + Kiến tạo", unit: "", dec: 0 },
    ],
  },
  {
    key: "attack",
    label: "Tấn công",
    icon: "sports_soccer",
    cats: [
      { name: "expected_goals", label: "Bàn thắng kỳ vọng (xG)", unit: "xG", dec: 2 },
      { name: "ontarget_scoring_att", label: "Sút trúng đích / 90", unit: "/90", dec: 2 },
      { name: "total_scoring_att", label: "Số cú sút / 90", unit: "/90", dec: 2 },
      { name: "big_chance_created", label: "Cơ hội lớn tạo ra", unit: "", dec: 0 },
      { name: "total_att_assist", label: "Cơ hội tạo ra", unit: "", dec: 0 },
      { name: "expected_assists", label: "Kiến tạo kỳ vọng (xA)", unit: "xA", dec: 2 },
      { name: "_expected_goals_and_expected_assists_per_90", label: "xG + xA / 90", unit: "/90", dec: 2 },
      { name: "big_chance_missed", label: "Bỏ lỡ cơ hội lớn", unit: "", dec: 0 },
      { name: "penalty_won", label: "Phạt đền được hưởng", unit: "", dec: 0 },
    ],
  },
  {
    key: "defend",
    label: "Phòng ngự",
    icon: "shield",
    cats: [
      { name: "defensive_contributions", label: "Hành động phòng ngự / 90", unit: "/90", dec: 2 },
      { name: "total_tackle", label: "Tắc bóng / 90", unit: "/90", dec: 2 },
      { name: "ball_recovery", label: "Thu hồi bóng / 90", unit: "/90", dec: 2 },
    ],
  },
  {
    key: "goalkeeping",
    label: "Thủ thành",
    icon: "sports_handball",
    cats: [
      { name: "clean_sheet", label: "Giữ sạch lưới", unit: "", dec: 0 },
      { name: "saves", label: "Cứu bóng / 90", unit: "/90", dec: 2 },
      { name: "_save_percentage", label: "Tỉ lệ cứu bóng", unit: "%", dec: 0 },
    ],
  },
  {
    key: "discipline",
    label: "Kỷ luật",
    icon: "playing_cards",
    cats: [
      { name: "fouls", label: "Phạm lỗi / 90", unit: "/90", dec: 2 },
      { name: "yellow_card", label: "Thẻ vàng", unit: "", dec: 0 },
      { name: "red_card", label: "Thẻ đỏ", unit: "", dec: 0 },
    ],
  },
];

function findChromium() {
  if (process.env.CHROME_EXE && existsSync(process.env.CHROME_EXE)) return process.env.CHROME_EXE;
  const base = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(base)) {
    const dirs = readdirSync(base)
      .filter((d) => d.startsWith("chromium-"))
      .sort()
      .reverse();
    for (const d of dirs) {
      const exe = join(base, d, "chrome-win", "chrome.exe");
      if (existsSync(exe)) return exe;
    }
  }
  return undefined; // để Playwright tự dùng browser mặc định nếu có
}

function normName(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Map đội FotMob -> mã đội & cờ của ta (để dùng cờ nhất quán với phần còn lại của web). */
function buildTeamMatcher(db) {
  const byKey = new Map();
  for (const t of db.teams || []) {
    byKey.set(normName(t.name), t);
    byKey.set(normName(t.code), t);
  }
  // một vài tên FotMob khác cách viết của ta
  const ALIAS = {
    [normName("USA")]: "USA",
    [normName("Korea Republic")]: "KOR",
    [normName("South Korea")]: "KOR",
    [normName("Bosnia & Herzegovina")]: "BIH",
    [normName("IR Iran")]: "IRN",
    [normName("Ivory Coast")]: "CIV",
    [normName("Cote d'Ivoire")]: "CIV",
    [normName("Czechia")]: "CZE",
  };
  return (teamName, ccode) => {
    const byCode = db.teams?.find((t) => normName(t.code) === normName(ccode));
    if (byCode) return byCode;
    const hit = byKey.get(normName(teamName)) || byKey.get(normName(ccode));
    if (hit) return hit;
    const aliasCode = ALIAS[normName(teamName)] || ALIAS[normName(ccode)];
    if (aliasCode) return db.teams?.find((t) => t.code === aliasCode);
    return null;
  };
}

const FOTMOB_PLAYER_IMG = (id) => `https://images.fotmob.com/image_resources/playerimages/${id}.png`;
const FOTMOB_TEAM_IMG = (id) => `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;

async function main() {
  const browser = await chromium.launch({
    headless: !HEADFUL,
    executablePath: findChromium(),
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();

    console.log(`→ Mở ${STATS_URL}`);
    const resp = await page.goto(STATS_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!resp || resp.status() >= 400) {
      throw new Error(`Trang trả HTTP ${resp && resp.status()} (Cloudflare chặn?). Thử STATS_HEADFUL=1.`);
    }
    await page.waitForTimeout(4000);

    // 1) Danh mục thống kê + fetchAllUrl nhúng trong __NEXT_DATA__
    const catalog = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      if (!el) return { err: "no __NEXT_DATA__" };
      const j = JSON.parse(el.textContent);
      const players = j?.props?.pageProps?.stats?.players;
      if (!Array.isArray(players)) return { err: "no stats.players" };
      const map = {};
      for (const p of players) if (p.name && p.fetchAllUrl) map[p.name] = p.fetchAllUrl;
      // seasonId suy từ url: .../stats/77/season/<id>/<stat>.json
      const sample = players.find((p) => p.fetchAllUrl)?.fetchAllUrl || "";
      const m = sample.match(/\/season\/(\d+)\//);
      return { map, seasonId: m ? Number(m[1]) : null };
    });
    if (catalog.err) throw new Error(`Không đọc được danh mục thống kê: ${catalog.err}`);

    const wanted = GROUPS.flatMap((g) => g.cats.map((c) => c.name));
    const urls = {};
    for (const name of wanted) {
      if (catalog.map[name]) urls[name] = catalog.map[name];
      else console.warn(`! FotMob không có hạng mục "${name}" mùa này — bỏ qua.`);
    }

    // 2) Fetch full bảng từng hạng mục NGAY TRONG page (qua được Cloudflare)
    console.log(`→ Tải ${Object.keys(urls).length} bảng xếp hạng (top ${TOP_N})…`);
    const raw = await page.evaluate(
      async ({ urls, topN }) => {
        const out = {};
        await Promise.all(
          Object.entries(urls).map(async ([name, url]) => {
            try {
              const r = await fetch(url);
              if (!r.ok) return;
              const j = await r.json();
              const list = j?.TopLists?.[0]?.StatList || [];
              out[name] = list.slice(0, topN).map((p) => ({
                rank: p.Rank,
                playerId: p.ParticiantId ?? p.ParticipantId,
                player: p.ParticipantName,
                teamId: p.TeamId,
                teamName: p.TeamName,
                ccode: p.ParticipantCountryCode,
                teamColor: p.TeamColor || null,
                value: p.StatValue,
                sub: p.SubStatValue ?? null,
                matches: p.MatchesPlayed ?? null,
                minutes: p.MinutesPlayed ?? null,
              }));
            } catch {
              /* bỏ qua hạng mục lỗi */
            }
          })
        );
        return out;
      },
      { urls, topN: TOP_N }
    );

    // 3) Map đội -> cờ của ta + ảnh FotMob, gom theo nhóm
    const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
    const matchTeam = buildTeamMatcher(db);

    let totalRows = 0;
    const groups = GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      icon: g.icon,
      categories: g.cats
        .filter((c) => Array.isArray(raw[c.name]) && raw[c.name].length)
        .map((c) => {
          const rows = raw[c.name].map((p) => {
            const team = matchTeam(p.teamName, p.ccode);
            totalRows++;
            return {
              rank: p.rank,
              player: p.player,
              value: p.value,
              sub: p.sub,
              matches: p.matches,
              teamCode: team?.code || p.ccode || null,
              teamName: team?.name || p.teamName || null,
              flag: team?.flag || (p.teamId ? FOTMOB_TEAM_IMG(p.teamId) : null),
              avatar: p.playerId ? FOTMOB_PLAYER_IMG(p.playerId) : null,
              color: p.teamColor,
            };
          });
          return { name: c.name, label: c.label, unit: c.unit, dec: c.dec, rows };
        }),
    })).filter((g) => g.categories.length);

    if (!totalRows) throw new Error("Không lấy được dòng dữ liệu nào (cấu trúc FotMob đổi?).");

    db.playerStats = {
      source: "FotMob",
      leagueId: Number(LEAGUE_ID),
      leagueName: "FIFA World Cup",
      seasonId: catalog.seasonId,
      sourceUrl: STATS_URL,
      updated: new Date().toISOString(),
      topN: TOP_N,
      groups,
    };
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");

    const catCount = groups.reduce((n, g) => n + g.categories.length, 0);
    console.log(`✓ Đã ghi playerStats: ${catCount} hạng mục, ${totalRows} dòng vào data/db.json`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
