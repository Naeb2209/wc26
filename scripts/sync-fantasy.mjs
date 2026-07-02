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
import { FANTASY_ROUNDS, mergeFantasySync } from "./fantasy-sync-utils.mjs";
import { writeKv, KV_KEYS } from "./kv.mjs";

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
    // FIFA đã đổi OAuth client sang dạng confidential (yêu cầu client_secret) → refresh token
    // không còn đổi được access token. Đây là lỗi PINGONE ĐÃ BIẾT, không phải sự cố của ta:
    // bỏ qua, dùng FIFA_COOKIE (phiên X-SID) làm phương thức xác thực chính.
    const knownDead = /invalid_client|Unsupported authentication method/i.test(e.message);
    if (knownDead && env.FIFA_COOKIE) {
      console.warn("ℹ Refresh token không dùng được (FIFA chuyển client sang confidential) → dùng FIFA_COOKIE.");
    } else {
      console.error("✗ Refresh thất bại:", e.message);
      if (!accessToken && !env.FIFA_COOKIE) process.exit(1);
      console.error("  → Thử tiếp bằng cookie/access token tĩnh nếu có…");
    }
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

  const fetchJson = async (requestUrl, requestHeaders = headers) => {
    const response = await fetch(requestUrl, { headers: requestHeaders });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${requestUrl}`);
    return response.json();
  };

  console.log("→ Tải rounds, players và squads công khai...");
  const [rounds, players, squads] = await Promise.all([
    fetchJson("https://play.fifa.com/json/fantasy/rounds.json", { accept: "application/json" }),
    fetchJson("https://play.fifa.com/json/fantasy/players.json", { accept: "application/json" }),
    fetchJson("https://play.fifa.com/json/fantasy/squads.json", { accept: "application/json" }),
  ]);

  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  // Trạng thái vòng đã lưu lần trước -> biết vòng nào đã được chốt sau khi kết thúc.
  const storedStatus = new Map((db.fantasy?.rounds || []).map((round) => [round.key, round.status]));

  const availableRounds = FANTASY_ROUNDS.filter(({ id, key }) => {
    const status = rounds.find((round) => Number(round.id) === id)?.status;
    if (!status || status === "scheduled") return false; // vòng chưa diễn ra
    // Vòng đã "complete" VÀ đã đồng bộ ít nhất 1 lần khi đã complete -> dữ liệu chốt,
    // không cần fetch lại cầu thủ/HLV nữa (mergeFantasySync giữ nguyên số liệu vòng cũ).
    if (process.env.FANTASY_FORCE_REFETCH !== "1" && status === "complete" && storedStatus.get(key) === "complete") {
      console.log(`↷ Bỏ qua vòng ${id} (đã kết thúc & đã chốt).`);
      return false;
    }
    return true;
  });
  const roundRankings = {};
  const histories = {};

  for (const round of availableRounds) {
    console.log(`→ Đồng bộ đội hình vòng ${round.id}/${FANTASY_ROUNDS.length}...`);
    const rankingJson = await fetchJson(`${url}&startId=${round.id}`);
    roundRankings[round.id] = rankingJson?.success?.ranks || [];
    histories[round.id] = {};

    await Promise.all(
      ranks.map(async (rank) => {
        try {
          const historyJson = await fetchJson(
            `https://play.fifa.com/api/en/fantasy/team/history/${round.id}/${rank.userId}`
          );
          const team = historyJson?.success;
          if (team?.id) histories[round.id][rank.userId] = { team };
        } catch (error) {
          console.warn(`  ! ${rank.userName || rank.userId}: ${error.message}`);
        }
      })
    );
  }

  // Chỉ số chi tiết FIFA cho NHỮNG cầu thủ được pick (file tĩnh, gồm mọi vòng + breakdown điểm).
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
  console.log(`→ Tải chỉ số FIFA (player_stats) cho ${pickedIds.size} cầu thủ được pick...`);
  const playerStats = {};
  const ids = [...pickedIds];
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        try {
          playerStats[id] = await fetchJson(`https://play.fifa.com/json/fantasy/player_stats/${id}.json`, {
            accept: "application/json",
          });
        } catch {
          /* cầu thủ chưa có chỉ số vòng nào -> bỏ qua */
        }
      })
    );
  }

  mergeFantasySync({ db, ranks, roundRankings, histories, rounds, players, squads, playerStats, leagueId });

  const standings = db.fantasy.standings;
  db.fantasy.summary = {
    roundWinner: [...standings].sort((a, b) => b.roundPoints - a.roundPoints)[0],
    seasonLeader: [...standings].sort((a, b) => b.totalPoints - a.totalPoints)[0],
    roundBottom: [...standings].sort((a, b) => a.roundPoints - b.roundPoints)[0],
  };

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log(`✓ Đã cập nhật ${standings.length} người và ${availableRounds.length} vòng vào data/db.json`);

  // Ghi lên KV nếu đã cấu hình -> web đọc runtime, không cần commit/deploy.
  if (await writeKv(KV_KEYS.fantasy, db.fantasy)) {
    console.log("✓ Đã ghi fantasy lên KV (wc26:fantasy).");
  }
}

main();
