# WC26 — Pitch Pulse 2026

Web nội bộ theo dõi FIFA World Cup 2026: bảng đấu (hạng FIFA), đội bóng, lịch thi đấu + đội hình dự kiến, và trực tiếp theo kênh VTV. **Toàn bộ dữ liệu lấy tự động từ API bóng đá** (có cache + failover), tự fallback về `data/db.json` khi chưa có key.

## Công nghệ
- **Next.js 14** (App Router) + **React 18**
- **TailwindCSS** với design system *Pitch Pulse 2026*
- Dữ liệu từ API (football-data.org / API-Football), cache `revalidate`, fallback `data/db.json`

## Chạy local
```bash
npm install
cp .env.local.example .env.local   # rồi điền API key
npm run dev                         # http://localhost:3000
```

## Chạy cho nội bộ công ty (cùng mạng LAN)
```bash
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```
Mọi người trong công ty mở `http://<IP-máy-chủ>:3000`.

## Các trang
| Đường dẫn | Mô tả |
|-----------|-------|
| `/`              | Bảng đấu 12 bảng + thứ hạng FIFA (top 2 viền xanh lá = đi tiếp) |
| `/teams`         | Danh sách 48 đội tuyển, nhóm theo bảng |
| `/teams/[code]`  | Chi tiết đội: cầu thủ, lịch, thống kê — vd `/teams/ARG` |
| `/schedule`      | Lịch thi đấu theo vòng + sơ đồ đội hình dự kiến |
| `/live`          | Trực tiếp: trận đang diễn ra lấy từ API, chọn kênh VTV (tự cập nhật 10s) |
| `/api/health`    | Chẩn đoán nguồn dữ liệu: thứ tự ưu tiên, ping từng API, nguồn đang dùng |

## Nguồn dữ liệu & failover
Cấu hình trong `.env.local` (xem `.env.local.example`). Web thử lần lượt:

```
football-data.org  →  API-Football  →  dữ liệu mẫu (data/db.json)
```

Nguồn nào lỗi / hết quota (429) → tự nhảy sang nguồn kế tiếp. Kiểm tra tình trạng tại `/api/health`.

- **football-data.org** (ưu tiên): token free tại https://www.football-data.org/client/register
- **API-Football** (dự phòng): key tại https://www.api-football.com/ — *lưu ý gói free thường giới hạn mùa giải, có thể không có 2026*

## Giới hạn của gói API free
- Bảng xếp hạng, lịch thi đấu, tỉ số trực tiếp: **có** (tỉ số free có độ trễ vài phút).
- Đội hình cầu thủ chi tiết, thống kê trận (kiểm soát bóng, cú sút), bình luận: **thường không có** ở gói free → web tự ẩn phần thiếu, hoặc dùng hồ sơ mẫu trong `data/db.json` nếu có.

## Dữ liệu mẫu / hạng FIFA
- `data/db.json` chứa: 12 bảng thật (fallback), hồ sơ mẫu vài đội, danh sách kênh VTV, bảng tra `fifaRanks` (API không cung cấp hạng FIFA — chỉnh trong file này).
- Cờ quốc gia: `flagcdn.com` theo mã ISO (fallback); khi dùng API thì lấy crest/logo từ API.

## Ghi chú
- Khung video ở trang `/live` là ảnh placeholder — gắn link stream/iframe thật khi cần.
