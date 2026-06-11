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
| `/`              | Bảng đấu 12 bảng + thứ hạng FIFA; đội trong bảng **tự xếp theo điểm → hiệu số → hạng FIFA** (top 2 viền xanh lá = đi tiếp) |
| `/teams`         | Danh sách 48 đội tuyển, nhóm theo bảng |
| `/teams/[code]`  | Chi tiết đội: cầu thủ, lịch, thống kê — vd `/teams/ARG` |
| `/schedule`      | Lịch thi đấu theo vòng (hiện **hạng FIFA** mỗi đội) + sơ đồ đội hình dự kiến với **icon áo đấu** theo màu đội |
| `/live`          | Trực tiếp: trận đang diễn ra lấy từ API, chọn kênh VTV (tự cập nhật 10s) |
| `/fantasy`       | BXH người chơi FIFA Fantasy (league nội bộ): podium top 3 + bảng điểm |
| `/api/live`      | API tỉ số trực tiếp (trận live + kênh) — trang `/live` polling endpoint này mỗi 10s |
| `/api/health`    | Chẩn đoán nguồn dữ liệu: thứ tự ưu tiên, ping từng API, nguồn đang dùng |

## Nguồn dữ liệu & failover
Cấu hình trong `.env.local` (xem `.env.local.example`). Web thử lần lượt:

```
football-data.org  →  API-Football  →  dữ liệu mẫu (data/db.json)
```

Nguồn nào lỗi / hết quota (429) → tự nhảy sang nguồn kế tiếp. Kiểm tra tình trạng tại `/api/health`.

Các biến env liên quan (xem `.env.local.example`):
- `FOOTBALL_DATA_TOKEN` / `API_FOOTBALL_KEY` — key 2 nguồn (điền 1 hoặc cả 2).
- `FOOTBALL_API_PROVIDER` — ép nguồn nào ưu tiên lên đầu (bỏ trống = football-data trước).
- `FOOTBALL_API_REVALIDATE` — thời gian cache dữ liệu (giây, mặc định `3600` = 1 giờ).

- **football-data.org** (ưu tiên): token free tại https://www.football-data.org/client/register
- **API-Football** (dự phòng): key tại https://www.api-football.com/ — *lưu ý gói free thường giới hạn mùa giải, có thể không có 2026*

## Giới hạn của gói API free
- Bảng xếp hạng, lịch thi đấu, tỉ số trực tiếp: **có** (tỉ số free có độ trễ vài phút).
- Đội hình cầu thủ chi tiết, thống kê trận (kiểm soát bóng, cú sút), bình luận: **thường không có** ở gói free → web tự ẩn phần thiếu, hoặc dùng hồ sơ mẫu trong `data/db.json` nếu có.

## Bảng xếp hạng Fantasy (`/fantasy`)
Điểm người chơi FIFA Fantasy của công ty, lưu trong `data/db.json` → `fantasy`:

```json
"fantasy": {
  "leagueName": "Giải Fantasy Nội Bộ Công Ty",
  "leagueUrl": "",                 // (tùy chọn) link league FIFA -> hiện nút "Mở league"
  "updatedRound": "Vòng 1",
  "standings": [
    { "rank": 1, "manager": "Nguyễn Văn An", "team": "Sấm Sét FC", "gw": 82, "total": 312, "prev": 2 }
  ]
}
```

### Đồng bộ tự động từ FIFA Fantasy

> ⚠️ FIFA bị **Akamai** bảo vệ → gọi bằng Node `fetch` (script `sync-fantasy`) **bị chặn ở tầng TLS** (`fetch failed`). Cách chạy được là **Playwright** (trình duyệt thật).

**Cách Playwright (khuyến nghị):**
```bash
npm install
npx playwright install chromium     # tải Chromium 1 lần (~150MB)

npm run fantasy:login               # mở cửa sổ thật -> ĐĂNG NHẬP FIFA 1 lần (phiên được lưu)
npm run fantasy:sync                # headless, dùng lại phiên, ghi BXH vào data/db.json
```
- Phiên lưu trong `.playwright-fifa/` (đã .gitignore). Đăng nhập 1 lần, sau đó chỉ chạy `fantasy:sync`.
- Nếu headless bị Akamai chặn (403): chạy có cửa sổ → `$env:FIFA_HEADFUL=1; npm run fantasy:sync` (PowerShell).
- Phiên hết hạn (sau nhiều ngày) → chạy lại `npm run fantasy:login`.
- Tự động theo lịch: đặt Windows Task Scheduler chạy `npm run fantasy:sync` mỗi ngày trên 1 máy luôn bật.

**Cách Console trình duyệt (không cần cài gì):** mở play.fifa.com (đã đăng nhập) → F12 → Console, chạy `fetch('/api/en/fantasy/ranking/league/1090?limit=100')...` rồi `copy()` kết quả, dán vào `fantasy.standings` trong db.json.

---

#### (Tham khảo) endpoint & cách Node fetch — thường bị Akamai chặn
Endpoint thật: `GET https://play.fifa.com/api/en/fantasy/ranking/league/<ID>`. Chạy ở máy bạn:

```bash
npm run sync-fantasy        # đọc .env.local, ghi BXH mới vào data/db.json
```

**Cách A (khuyến nghị) — Refresh token, sống ~30 ngày:**
```
FIFA_LEAGUE_ID=1090
FIFA_REFRESH_TOKEN=<field "refreshToken" trong cookie fp.user, lấy 1 lần>
```
Script tự đổi refresh → access token mới mỗi lần chạy, và **tự lưu lại** refresh token xoay (PingOne rotation). → ~1 tháng mới phải lấy lại.

**Cách B — Cookie, sống ~1–2h:** `FIFA_COOKIE=<chuỗi cookie từ DevTools>`. Đơn giản nhưng lấy lại thường xuyên.

> ⚠️ FIFA bị **Akamai** bảo vệ. Nếu refresh token (Bearer) bị chặn 403, đặt **kèm `FIFA_COOKIE`** mới: refresh token lo đăng nhập, cookie lo vượt Akamai.

- `getFantasy()` ([lib/fifa-api.js](lib/fifa-api.js)) cũng tự gọi endpoint nếu env có cookie/access token, nhưng **server (Vercel) dễ bị Akamai chặn + không lưu được refresh token xoay** → ưu tiên `npm run sync-fantasy` (local).
- Không cấu hình gì → trang dùng `fantasy.standings` tĩnh trong db.json.

## Dữ liệu mẫu / hạng FIFA
- `data/db.json` chứa: 12 bảng thật (fallback), hồ sơ mẫu vài đội, danh sách kênh VTV (`channels`), bảng tra `fifaRanks` (API không cung cấp hạng FIFA — chỉnh trong file này), bảng `broadcast` (trận → kênh VTV), BXH `fantasy`, và dữ liệu trận `live` mẫu.
- `stages` + `schedule`: khung lịch theo vòng cho trang `/schedule`. `stages` = `Vòng Bảng → Vòng 32 Đội → Vòng 16 Đội → Tứ Kết → Bán Kết → Chung Kết`; `schedule` chứa data từng vòng (hiện có sẵn "Vòng Bảng", các vòng knock-out để trống chờ điền sau khi bốc thăm). API có thì tự ghi đè, không có thì dùng data này.
- `fifaRanks` (mã đội → hạng) dùng cho: badge hạng ở bảng đấu & lịch thi đấu, và làm tiêu chí xếp hạng trong bảng khi các đội bằng điểm/hiệu số. Cập nhật theo bảng xếp hạng FIFA mới nhất; `getStandings()`/`getSchedule()` ([lib/fifa-api.js](lib/fifa-api.js)) tự gắn hạng vào từng đội/trận.
- Cờ quốc gia: `flagcdn.com` theo mã ISO (fallback); khi dùng API thì lấy crest/logo từ API.

## Trực tiếp VTV (link ra VTVGo)
Trang `/live` **không nhúng luồng** (tránh vấn đề bản quyền). Mỗi kênh có nút **“Xem trên VTVGo”** mở nền tảng chính thức của VTV ở tab mới. Cấu hình trong `data/db.json`:

```json
{ "code": "VTV3", "name": "VTV3 HD", "program": "...", "watchUrl": "https://vtvgo.vn/xem-truc-tuyen-kenh-vtv3-3.html" }
```

- Bấm kênh ở cột phải để chọn → khung chính hiện nút “Xem trên VTVGo”.
- URL VTVGo đã xác minh: VTV1/2/3/7/9 và VTV Cần Thơ. *(VTV10 không tồn tại trên VTVGo → tạm trỏ trang chủ.)*
- Tỉ số/diễn biến (khi có trận) vẫn lấy từ API và polling 10s như các trang khác.

> ⚠️ **Bản quyền:** VTV giữ bản quyền World Cup tại VN. Cách dùng hợp pháp là **dẫn link sang VTVGo** (đang dùng) hoặc nhúng luồng công ty có giấy phép. Không re-stream luồng VTV không được cấp phép.
>
> 💡 Nếu sau này có **luồng HLS (.m3u8) được cấp phép**, có thể chuyển lại sang nhúng trực tiếp bằng `hls.js` (thêm trường `stream` cho kênh).

### Trận nào trên kênh nào (badge "Trực tiếp: VTVx")
API bóng đá không cho biết đài VN phát trận nào → dùng bảng `broadcast` trong `data/db.json`:

```json
"broadcast": {
  "default": "VTV3",              // kênh mặc định (VTV3 = kênh tâm điểm)
  "byMatch": {
    "MEX-KOR": "VTV3",            // key = "MÃ_NHÀ-MÃ_KHÁCH" (mã 3 chữ của API)
    "CZE-RSA": "VTV2"
  }
}
```

- Trận có trong `byMatch` → hiện kênh đó; còn lại → `default`.
- Badge **"Trực tiếp: VTVx"** tự hiện trên trang Lịch thi đấu, chi tiết đội, và trang Trực tiếp (kèm tự chọn đúng kênh đang phát trận live).
- Cập nhật `byMatch` theo **lịch phát sóng VTV công bố** (đặc biệt các trận trùng giờ lượt cuối vòng bảng được chia sang VTV2/VTV9/VTV10).
