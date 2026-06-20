#!/usr/bin/env node
/**
 * Đồng bộ BXH FIFA Fantasy bằng Playwright (trình duyệt thật -> vượt Akamai).
 *
 * Cài 1 lần:
 *   npm install
 *   npx playwright install chromium
 *
 * Dùng:
 *   npm run fantasy:login     # mở cửa sổ thật, ĐĂNG NHẬP FIFA 1 lần (phiên được lưu)
 *   npm run fantasy:sync      # headless, dùng lại phiên, ghi BXH vào data/db.json
 *
 * Nếu sync bị Akamai chặn ở headless, đặt FIFA_HEADFUL=1 để chạy có cửa sổ:
 *   (PowerShell)  $env:FIFA_HEADFUL=1; npm run fantasy:sync
 *
 * Phiên đăng nhập lưu trong .playwright-fifa/ (đã .gitignore — KHÔNG commit).
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mergeFantasySync } from "./fantasy-sync-utils.mjs";
import { writeKv, KV_KEYS } from "./kv.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "db.json");
const USER_DIR = join(ROOT, ".playwright-fifa");
const ENV_PATH = join(ROOT, ".env.local");

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(ENV_PATH)) {
    for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function updateEnvVar(key, value) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  content = pattern.test(content)
    ? content.replace(pattern, line)
    : content + (content && !content.endsWith("\n") ? "\n" : "") + `${line}\n`;
  writeFileSync(ENV_PATH, content, "utf8");
}

function findRefreshToken(value) {
  if (!value) return null;
  if (typeof value === "object") {
    if (typeof value.refreshToken === "string" && value.refreshToken) return value.refreshToken;
    for (const nested of Object.values(value)) {
      const token = findRefreshToken(nested);
      if (token) return token;
    }
  }
  return null;
}

function refreshTokenFromCookie(cookieValue) {
  const candidates = [cookieValue];
  try {
    candidates.push(decodeURIComponent(cookieValue));
  } catch {}

  for (const candidate of candidates) {
    try {
      const token = findRefreshToken(JSON.parse(candidate));
      if (token) return token;
    } catch {}
  }
  return null;
}

const env = loadEnv();
const MODE = process.argv[2] || "sync";
const LEAGUE = env.FIFA_LEAGUE_ID || "1090";
const HEADFUL = !!env.FIFA_HEADFUL;

// Dùng lại binary Chromium mà `npx playwright install chromium` đã tải (giống sync-stats/sync-rounds),
// tránh lỗi khi phiên bản Playwright trỏ tới chromium build chưa tải về.
function findChromium() {
  if (env.CHROME_EXE && existsSync(env.CHROME_EXE)) return env.CHROME_EXE;
  const base = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(base)) {
    for (const d of readdirSync(base).filter((d) => d.startsWith("chromium-")).sort().reverse()) {
      for (const sub of ["chrome-win", "chrome-win64"]) {
        const exe = join(base, d, sub, "chrome.exe");
        if (existsSync(exe)) return exe;
      }
    }
  }
  return undefined; // để Playwright tự dùng mặc định nếu có
}

async function openContext(headless) {
  return chromium.launchPersistentContext(USER_DIR, {
    headless,
    executablePath: findChromium(),
    viewport: { width: 1280, height: 800 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function isLoggedIn(ctx) {
  const cookies = await ctx.cookies("https://play.fifa.com");
  return cookies.some((c) => c.name === "X-SID" || c.name === "fp.user");
}

async function verifyFantasySession(page) {
  return page.evaluate(async (leagueId) => {
    try {
      const response = await fetch(`/api/en/fantasy/ranking/league/${leagueId}?limit=1`, {
        headers: { accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) return { ok: false, status: response.status };
      const payload = await response.json();
      return { ok: Array.isArray(payload?.success?.ranks), status: response.status };
    } catch (error) {
      return { ok: false, status: 0, error: String(error) };
    }
  }, LEAGUE);
}

async function mapAndWrite(payload) {
  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  mergeFantasySync({
    db,
    ranks: payload.ranks,
    roundRankings: payload.roundRankings,
    histories: payload.histories,
    rounds: payload.rounds,
    players: payload.players,
    squads: payload.squads,
    playerStats: payload.playerStats,
    leagueId: LEAGUE,
  });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log(`✓ Đã cập nhật ${db.fantasy.standings.length} người và đội hình từng vòng vào data/db.json`);

  // Ghi lên KV nếu đã cấu hình -> web đọc runtime, không cần commit/deploy.
  if (await writeKv(KV_KEYS.fantasy, db.fantasy)) {
    console.log("✓ Đã ghi fantasy lên KV (wc26:fantasy).");
  }
}

async function runLogin() {
  const ctx = await openContext(false);
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(`https://play.fifa.com/fantasy/leagues/${LEAGUE}/table`, {
      waitUntil: "domcontentloaded",
    });
    const currentSession = await verifyFantasySession(page);
    if (!currentSession.ok) {
      await ctx.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => {});
      await page.goto(`https://play.fifa.com/fantasy/leagues/${LEAGUE}/table`, {
        waitUntil: "domcontentloaded",
      });
    }
    console.log("→ Hãy ĐĂNG NHẬP trong cửa sổ vừa mở. Đang chờ (tối đa 5 phút)…");
    for (let i = 0; i < 150; i++) {
      const hasAuthCookie = await isLoggedIn(ctx);
      const session = hasAuthCookie ? await verifyFantasySession(page) : { ok: false };
      if (session.ok) {
        const cookies = await ctx.cookies("https://play.fifa.com");
        const userCookie = cookies.find((cookie) => cookie.name === "fp.user");
        const refreshToken = refreshTokenFromCookie(userCookie?.value);
        const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        if (cookieHeader) {
          updateEnvVar("FIFA_COOKIE", cookieHeader);
          console.log("✓ Đã lưu FIFA_COOKIE vào .env.local.");
        }
        if (refreshToken) {
          updateEnvVar("FIFA_REFRESH_TOKEN", refreshToken);
          console.log("✓ Đã lưu FIFA_REFRESH_TOKEN vào .env.local.");
        } else {
          console.log("! Đã đăng nhập nhưng không đọc được refresh token từ cookie fp.user.");
        }
        console.log("✓ Phiên đã được lưu. Giờ chạy: npm run fantasy:sync");
        return;
      }
      await page.waitForTimeout(2000);
    }
    console.log("✗ Hết thời gian chờ. Chạy lại 'npm run fantasy:login'.");
  } finally {
    await ctx.close();
  }
}

async function runSync() {
  if (!existsSync(USER_DIR)) {
    console.error("✗ Chưa có phiên đăng nhập. Chạy trước: npm run fantasy:login");
    process.exit(1);
  }
  const ctx = await openContext(!HEADFUL);
  try {
    if (!(await isLoggedIn(ctx))) {
      console.error("✗ Phiên hết hạn / chưa đăng nhập. Chạy lại: npm run fantasy:login");
      process.exit(1);
    }
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto("https://play.fifa.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000); // để Akamai sensor JS chạy, set cookie bot hợp lệ
    const session = await verifyFantasySession(page);
    if (!session.ok) {
      console.error(`✗ Phiên FIFA không hợp lệ (HTTP ${session.status || 0}). Chạy lại: npm run fantasy:login`);
      process.exit(1);
    }

    const result = await page.evaluate(async (leagueId) => {
      try {
        const getJson = async (url) => {
          const response = await fetch(url, {
            headers: { accept: "application/json" },
            credentials: "include",
          });
          if (!response.ok) {
            const error = new Error(`HTTP ${response.status} ${url}`);
            error.status = response.status;
            throw error;
          }
          return response.json();
        };

        const [ranking, rounds, players, squads] = await Promise.all([
          getJson(`/api/en/fantasy/ranking/league/${leagueId}?limit=100`),
          getJson("/json/fantasy/rounds.json"),
          getJson("/json/fantasy/players.json"),
          getJson("/json/fantasy/squads.json"),
        ]);
        const ranks = ranking?.success?.ranks || [];
        const availableRounds = rounds.filter((round) => round.status !== "scheduled");
        const roundRankings = {};
        const histories = {};

        for (const round of availableRounds) {
          const roundRanking = await getJson(
            `/api/en/fantasy/ranking/league/${leagueId}?limit=100&startId=${round.id}`
          );
          roundRankings[round.id] = roundRanking?.success?.ranks || [];
          histories[round.id] = {};

          const results = await Promise.all(
            ranks.map(async (rank) => {
              try {
                const history = await getJson(`/api/en/fantasy/team/history/${round.id}/${rank.userId}`);
                return [rank.userId, history?.success || null];
              } catch {
                return [rank.userId, null];
              }
            })
          );
          for (const [userId, team] of results) {
            if (team?.id) histories[round.id][userId] = { team };
          }
        }

        // Chỉ số chi tiết FIFA cho NHỮNG cầu thủ được pick (file tĩnh / cầu thủ, gồm mọi vòng).
        // /json/fantasy/player_stats/<id>.json -> [{ roundId, points, stats:{MP,GS,AS,T,ST,CC,S,CS,GC,...} }]
        const pickedIds = new Set();
        const collect = (map) => {
          if (map) for (const pos of Object.keys(map)) for (const id of map[pos] || []) pickedIds.add(Number(id));
        };
        for (const rid of Object.keys(histories)) {
          for (const uid of Object.keys(histories[rid])) {
            const t = histories[rid][uid].team;
            collect(t.lineup);
            collect(t.bench);
            if (t.twelfthMan?.playerId) pickedIds.add(Number(t.twelfthMan.playerId));
          }
        }
        const playerStats = {};
        const ids = [...pickedIds];
        for (let i = 0; i < ids.length; i += 20) {
          await Promise.all(
            ids.slice(i, i + 20).map(async (id) => {
              try {
                const r = await fetch(`/json/fantasy/player_stats/${id}.json`);
                if (r.ok) playerStats[id] = await r.json();
              } catch {}
            })
          );
        }

        return {
          ok: true,
          payload: { ranks, roundRankings, histories, rounds, players, squads, playerStats },
        };
      } catch (e) {
        return { ok: false, status: Number(e?.status) || 0, text: String(e) };
      }
    }, LEAGUE);

    if (!result.ok) {
      console.error(`✗ API HTTP ${result.status}. ${result.text.slice(0, 160)}`);
      if (result.status === 403) console.error("  → Akamai chặn. Thử: $env:FIFA_HEADFUL=1; npm run fantasy:sync");
      process.exit(1);
    }
    const ranks = result.payload?.ranks;
    if (!Array.isArray(ranks) || !ranks.length) {
      console.error("✗ Không có ranks (sai league id hoặc chưa join?).");
      process.exit(1);
    }
    await mapAndWrite(result.payload);
  } finally {
    await ctx.close();
  }
}

if (MODE === "login") await runLogin();
else await runSync();
