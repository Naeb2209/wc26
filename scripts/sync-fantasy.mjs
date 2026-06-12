#!/usr/bin/env node
/**
 * Đồng bộ BXH FIFA Fantasy league -> data/db.json (fantasy.standings).
 *
 * 2 cách xác thực (ưu tiên refresh token):
 *   A. REFRESH TOKEN (sống ~30 ngày) — đỡ phải lấy lại liên tục:
 *        FIFA_LEAGUE_ID=1090
 *        FIFA_REFRESH_TOKEN=<lấy 1 lần từ cookie fp.user -> field refreshToken>
 *      Script tự đổi refresh -> access token mới mỗi lần chạy, và LƯU LẠI refresh token
 *      mới (PingOne xoay token mỗi lần dùng).
 *
 *   B. COOKIE (sống ~1-2h) — đơn giản, lấy lại thường xuyên:
 *        FIFA_LEAGUE_ID=1090
 *        FIFA_COOKIE=<dán nguyên chuỗi cookie từ DevTools>
 *
 *   Có thể đặt CẢ HAI: refresh token lo phần đăng nhập, cookie lo phần vượt Akamai.
 *
 * Chạy:  npm run sync-fantasy
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "data", "db.json");
const ENV_PATH = join(ROOT, ".env.local");

// Định danh OAuth của FIFA Fantasy SPA (công khai, không phải bí mật) — có thể override qua env.
const DEFAULT_PINGONE_ENV = "3f85e2e1-0232-4f84-9da8-bba9279f1a23";
const DEFAULT_PINGONE_CLIENT = "35072598-fc20-4142-a469-1b940db47e6f";

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

// Ghi/đổi 1 biến trong .env.local (giữ nguyên các dòng khác)
function updateEnvVar(key, value) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) content = content.replace(re, `${key}=${value}`);
  else content += (content && !content.endsWith("\n") ? "\n" : "") + `${key}=${value}\n`;
  writeFileSync(ENV_PATH, content, "utf8");
}

async function refreshAccessToken(env) {
  const envId = env.FIFA_PINGONE_ENV || DEFAULT_PINGONE_ENV;
  const clientId = env.FIFA_PINGONE_CLIENT || DEFAULT_PINGONE_CLIENT;
  const refreshToken = env.FIFA_REFRESH_TOKEN;
  if (!refreshToken) return null;

  const url = `https://auth.pingone.eu/${envId}/as/token`;
  console.log("→ Đổi refresh token lấy access token mới…");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`refresh HTTP ${res.status} — ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  // PingOne xoay refresh token -> lưu lại token mới để lần sau còn dùng
  if (j.refresh_token && j.refresh_token !== refreshToken) {
    updateEnvVar("FIFA_REFRESH_TOKEN", j.refresh_token);
    console.log("  ↻ refresh token đã xoay → đã lưu token mới vào .env.local");
  }
  if (!j.access_token) throw new Error("refresh không trả access_token");
  console.log(`  ✓ access token mới (hết hạn sau ${j.expires_in || "?"}s)`);
  return j.access_token;
}

async function main() {
  const env = loadEnv();
  const leagueId = env.FIFA_LEAGUE_ID;
  if (!leagueId) {
    console.error("✗ Thiếu FIFA_LEAGUE_ID trong .env.local");
    process.exit(1);
  }

  // Lấy access token: ưu tiên refresh token, sau đó tới access token tĩnh.
  let accessToken = env.FIFA_ACCESS_TOKEN || null;
  try {
    const refreshed = await refreshAccessToken(env);
    if (refreshed) accessToken = refreshed;
  } catch (e) {
    console.error("✗ Refresh thất bại:", e.message);
    if (!accessToken && !env.FIFA_COOKIE) process.exit(1);
    console.error("  → Thử tiếp bằng cookie/access token tĩnh nếu có…");
  }

  if (!accessToken && !env.FIFA_COOKIE) {
    console.error("✗ Cần FIFA_REFRESH_TOKEN hoặc FIFA_COOKIE (hoặc FIFA_ACCESS_TOKEN) trong .env.local");
    process.exit(1);
  }

  const headers = {
    accept: "application/json, text/plain, */*",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  if (env.FIFA_COOKIE) headers.cookie = env.FIFA_COOKIE;

  const url = `https://play.fifa.com/api/en/fantasy/ranking/league/${leagueId}?limit=100`;
  console.log("→ GET", url);

  let res;
  try {
    res = await fetch(url, { headers });
  } catch (e) {
    console.error("✗ Không kết nối được:", e.message);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status} ${res.statusText}.`);
    if (res.status === 401 || res.status === 403) {
      console.error("  → Token hết hạn, hoặc Akamai chặn. Thử thêm FIFA_COOKIE mới (lấy từ trình duyệt) cạnh refresh token.");
    }
    process.exit(1);
  }

  const json = await res.json();
  const ranks = json?.success?.ranks;
  if (!Array.isArray(ranks) || !ranks.length) {
    console.error("✗ Response không có ranks (sai league id hoặc chưa join?).");
    process.exit(1);
  }

  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  db.fantasy = db.fantasy || {};
  const oldRank = {};
  for (const s of db.fantasy.standings || []) oldRank[s.manager] = s.rank;

  db.fantasy.leagueId = Number(leagueId);
  
  const standings = ranks.map((r, i) => {
    const manager = r.userName || `User ${r.userId}`;

    return {
      userId: r.userId,
      rank: r.overallRank ?? i + 1,
      roundRank: r.roundRank ?? i + 1,

      manager,

      roundPoints: r.roundPoints ?? 0,
      totalPoints: r.overallPoints ?? 0,

      avatar: r.avatar || "",

      roundWins: 0,
      bottoms: 0
    };
  });

  db.fantasy.standings = standings;

  const roundWinner =
  [...standings]
    .sort((a,b)=>b.roundPoints-a.roundPoints)[0];

  const seasonLeader =
    [...standings]
      .sort((a,b)=>b.totalPoints-a.totalPoints)[0];

  const roundBottom =
    [...standings]
      .sort((a,b)=>a.roundPoints-b.roundPoints)[0];

  db.fantasy.summary = {
    roundWinner,
    seasonLeader,
    roundBottom
  };
  
  db.fantasy.updatedRound = `Cập nhật ${new Date().toLocaleString("vi-VN")}`;

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log(`✓ Đã cập nhật ${db.fantasy.standings.length} người vào data/db.json`);
}

main();
