// Helper ghi dữ liệu động lên Upstash Redis / Vercel KV cho các script sync (Node).
//
// Cấu hình bằng env (giống lib/kv.js): UPSTASH_REDIS_REST_URL/TOKEN hoặc KV_REST_API_URL/TOKEN.
// Thiếu cấu hình -> writeKv() trả false (script vẫn ghi data/db.json như cũ).

import { Redis } from "@upstash/redis";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");

// Nạp .env.local vào process.env cho lần chạy local (CI đã có sẵn env -> bỏ qua).
export function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const KV_KEYS = { fantasy: "wc26:fantasy", playerStats: "wc26:playerStats", roundStats: "wc26:roundStats" };

function getKv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

// Ghi 1 key JSON lên KV. Trả về true nếu đã ghi, false nếu chưa cấu hình / ghi lỗi.
// Không ném lỗi: mạng chặn KV (vd sau firewall công ty) thì sync vẫn xong vì đã ghi db.json.
export async function writeKv(key, value) {
  loadEnvLocal();
  const kv = getKv();
  if (!kv) return false;
  try {
    await kv.set(key, value);
    return true;
  } catch (e) {
    console.warn(`! Ghi KV thất bại (${e.message}) — bỏ qua, đã có data/db.json.`);
    return false;
  }
}

// Đọc 1 key JSON từ KV. Trả về null nếu chưa cấu hình / lỗi (để caller fallback db.json).
export async function readKv(key) {
  loadEnvLocal();
  const kv = getKv();
  if (!kv) return null;
  try {
    return (await kv.get(key)) ?? null;
  } catch (e) {
    console.warn(`! Đọc KV thất bại (${e.message}) — dùng data/db.json.`);
    return null;
  }
}
