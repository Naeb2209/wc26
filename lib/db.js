import dbData from "@/data/db.json";

export { flagUrl } from "./flags";

// db.json được import tĩnh -> luôn được đóng gói khi build (an toàn cho serverless/Vercel,
// nơi filesystem chỉ đọc). Dữ liệu này chỉ dùng làm fallback khi API lỗi/chưa có key.
export async function readDb() {
  return dbData;
}
