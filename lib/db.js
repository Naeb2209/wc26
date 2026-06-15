import dbData from "@/data/db.json";
import { cache } from "react";
import { getKv, KV_KEYS } from "./kv";

export { flagUrl } from "./flags";

// db.json được import tĩnh -> luôn được đóng gói khi build (an toàn cho serverless/Vercel,
// nơi filesystem chỉ đọc). Đây là snapshot nền cho dữ liệu ÍT đổi (đội, lịch, bảng đấu…).
//
// Dữ liệu HAY đổi (fantasy, playerStats) được đọc từ KV lúc runtime nếu đã cấu hình,
// và phủ lên snapshot nền. Chưa cấu hình KV -> dùng nguyên snapshot tĩnh (web không vỡ).
//
// cache() của React gộp các lần gọi trong CÙNG một request -> chỉ đọc KV một lần/request,
// nhưng mỗi request mới vẫn lấy số liệu mới nhất.
export const readDb = cache(async () => {
  const kv = getKv();
  if (!kv) return dbData;

  try {
    const [fantasy, playerStats, roundStats] = await Promise.all([
      kv.get(KV_KEYS.fantasy),
      kv.get(KV_KEYS.playerStats),
      kv.get(KV_KEYS.roundStats),
    ]);
    return {
      ...dbData,
      fantasy: fantasy ?? dbData.fantasy,
      playerStats: playerStats ?? dbData.playerStats,
      roundStats: roundStats ?? dbData.roundStats,
    };
  } catch (e) {
    console.error("[db] Đọc KV lỗi, dùng snapshot tĩnh:", e.message);
    return dbData;
  }
});
