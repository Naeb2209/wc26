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
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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

const env = loadEnv();
const MODE = process.argv[2] || "sync";
const LEAGUE = env.FIFA_LEAGUE_ID || "1090";
const HEADFUL = !!env.FIFA_HEADFUL;

async function openContext(headless) {
  return chromium.launchPersistentContext(USER_DIR, {
    headless,
    viewport: { width: 1280, height: 800 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function isLoggedIn(ctx) {
  const cookies = await ctx.cookies("https://play.fifa.com");
  return cookies.some((c) => c.name === "fp.user");
}

function mapAndWrite(ranks) {
  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  db.fantasy = db.fantasy || {};
  const oldRank = {};
  for (const s of db.fantasy.standings || []) oldRank[s.manager] = s.rank;

  db.fantasy.leagueId = Number(LEAGUE);
  db.fantasy.standings = ranks.map((r, i) => {
    const manager = r.userName || `User ${r.userId}`;
    return {
      rank: r.overallRank ?? i + 1,
      manager,
      team: "",
      gw: r.roundPoints ?? 0,
      total: r.overallPoints ?? 0,
      prev: r.overallRankPrevious ?? oldRank[manager] ?? null,
      avatar: r.avatar || "",
    };
  });
  db.fantasy.updatedRound = `Cập nhật ${new Date().toLocaleString("vi-VN")}`;
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log(`✓ Đã cập nhật ${db.fantasy.standings.length} người vào data/db.json`);
}

async function runLogin() {
  const ctx = await openContext(false);
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto("https://play.fifa.com/", { waitUntil: "domcontentloaded" });
    console.log("→ Hãy ĐĂNG NHẬP trong cửa sổ vừa mở. Đang chờ (tối đa 5 phút)…");
    for (let i = 0; i < 150; i++) {
      if (await isLoggedIn(ctx)) {
        console.log("✓ Đã đăng nhập. Phiên đã được lưu. Giờ chạy: npm run fantasy:sync");
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

    const result = await page.evaluate(async (leagueId) => {
      try {
        const res = await fetch(`/api/en/fantasy/ranking/league/${leagueId}?limit=100`, {
          headers: { accept: "application/json" },
          credentials: "include",
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      } catch (e) {
        return { ok: false, status: 0, text: String(e) };
      }
    }, LEAGUE);

    if (!result.ok) {
      console.error(`✗ API HTTP ${result.status}. ${result.text.slice(0, 160)}`);
      if (result.status === 403) console.error("  → Akamai chặn. Thử: $env:FIFA_HEADFUL=1; npm run fantasy:sync");
      process.exit(1);
    }
    const json = JSON.parse(result.text);
    const ranks = json?.success?.ranks;
    if (!Array.isArray(ranks) || !ranks.length) {
      console.error("✗ Không có ranks (sai league id hoặc chưa join?).");
      process.exit(1);
    }
    mapAndWrite(ranks);
  } finally {
    await ctx.close();
  }
}

if (MODE === "login") await runLogin();
else await runSync();
