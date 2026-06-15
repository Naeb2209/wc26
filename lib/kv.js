// Kết nối Upstash Redis / Vercel KV (đọc snapshot dữ liệu động lúc runtime).
//
// Mục đích: dữ liệu hay đổi (fantasy, playerStats) lưu ở KV thay vì commit vào db.json.
// → cập nhật không kích Vercel build lại (hết spam deploy), và web đọc số mới ngay.
//
// Hỗ trợ cả 2 cách đặt biến môi trường:
//   - Upstash trực tiếp:   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   - Vercel KV (Marketplace): KV_REST_API_URL / KV_REST_API_TOKEN
// Thiếu cả hai -> getKv() trả null và web tự fallback về snapshot tĩnh trong db.json.

import { Redis } from "@upstash/redis";

export const KV_KEYS = {
  fantasy: "wc26:fantasy",
  playerStats: "wc26:playerStats",
  roundStats: "wc26:roundStats",
};

let cached; // undefined = chưa khởi tạo; null = không cấu hình

export function getKv() {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  cached = url && token ? new Redis({ url, token }) : null;
  return cached;
}

export function kvConfigured() {
  return !!getKv();
}
