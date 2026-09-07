# Việc cần làm — DC42 Hub

Branch: `feat/dc42-hub` · Viết ngày 07/09/2026

Xếp theo mức đáng làm trước. Mục 1 là thứ khiến web đang **sai**, các mục sau là **chưa đẹp / chưa
tối ưu** — làm được tới đâu thì làm.

## Chạy web lên trước khi sửa

Node đã cài dạng portable ở `C:\Users\hoang\node` (v22.20.0, npm 10.9.3), đã thêm vào PATH của user.

```bash
npm run dev
```

Nếu terminal báo `npm is not recognized` → mở **cửa sổ PowerShell mới** (cửa sổ cũ giữ PATH lúc nó
khởi động). `node_modules` đã cài sẵn, không cần `npm install` lại.

---

## 1. Sửa những chỗ đang sai (ưu tiên cao nhất)

### 1a. Điểm danh mất dữ liệu khi restart

Hiện `lib/dc42-rsvp.js` lưu trong bộ nhớ tiến trình vì chưa cấu hình KV → bấm điểm danh được nhưng
restart là mất, và các instance trên Vercel không thấy dữ liệu của nhau. Trang Giao lưu đang tự báo
trạng thái này ở đầu trang.

1. Tạo Redis free ở [console.upstash.com](https://console.upstash.com) → Create Database.
2. Lấy `KV_REST_API_URL` + `KV_REST_API_TOKEN` (token **read-write**, không phải read-only).
3. Khai ở 3 nơi (xem mục "Dữ liệu động bằng KV" trong `README.md` — cơ chế đã dựng sẵn):
   - `.env.local` ở máy
   - Vercel → Project → Settings → Environment Variables (đổi env xong **redeploy 1 lần**)
   - GitHub → Settings → Secrets and variables → Actions → Secrets
4. **Thêm 2 biến này vào `.env.local.example`** — hiện file đó chưa có dòng nào về KV
   (`grep -c "KV_REST\|UPSTASH" .env.local.example` ra `0`), nên người khác clone về không biết phải
   cấu hình gì:

```
# Kho key-value cho dữ liệu động: điểm danh DC42 (dc42:rsvp:*), fantasy, playerStats, roundStats.
# Thiếu 2 biến này thì điểm danh chỉ lưu tạm trong RAM và mất khi restart.
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

5. Kiểm tra: mở `/the-thao/bong-da/giao-luu`, bấm "Tôi tham gia", restart dev server, refresh — tên
   phải còn. Dòng cảnh báo "Chưa nối KV nên điểm danh chỉ lưu tạm trên server này" ở đầu trang phải
   biến mất.

### 1b. `attendanceLog` bóng đá lệch 1 ngày

Trong `data/dc42.json`, 7 dòng `sport: "football"` đang ghi các ngày **thứ 5**, trong khi
`sessionTemplates` có `st-football-thu` là `weekday: 3` = **thứ 4**. (Phần cầu lông đã sửa xong hôm nay,
đang đúng thứ 5 theo `st-badminton-thu`.)

| Hiện tại (thứ 5 — sai) | Phải là (thứ 4) |
|---|---|
| 2026-08-27 | 2026-09-02 |
| 2026-08-20 | 2026-08-26 |
| 2026-08-13 | 2026-08-19 |
| 2026-08-06 | 2026-08-12 |
| 2026-07-30 | 2026-08-05 |
| 2026-07-23 | 2026-07-29 |
| 2026-07-16 | 2026-07-22 |

Sửa xong nhớ **xếp lại mảng theo ngày giảm dần** (mảng đang sort descending). Việc này cũng dọn luôn
chuyện bóng đá và cầu lông hiện trùng ngày nhau — sau khi sửa thì bóng đá thứ 4, cầu lông thứ 5, không
còn dòng nào trùng.

Kiểm tra: `/xep-hang` → bảng "Chuyên cần 2026", tổng số lượt không đổi (chỉ ngày đổi).

---

## 2. Thay dữ liệu mẫu bằng dữ liệu thật

### 2a. `members[]` đang nửa thật nửa giả

- `m01`–`m16`: tên mẫu (Nguyễn Minh Quân, Trần Hoàng Anh, Lê Tuấn Kiệt, Nguyễn Thu Hà…) — **đang chạy
  khắp** `attendanceLog`, `honours`, `regulars` của `sessionTemplates`, `topScorer` của các giải, và
  `entries` của giải cầu lông.
- `m20`–`m34`: trông như người thật, có số áo (Hậu Phạm #2, Anh Thạch #3, Đông Nguyễn #4, Vũ Đỗ #12…) —
  đang dùng cho `roster` của TMA Futsal League 2026.

Cần chốt một danh sách thật. Lưu ý: đổi `id` thì phải đổi theo ở tất cả chỗ tham chiếu ở trên, nên cách
an toàn là **giữ nguyên id, chỉ đổi `name`/`short`/`team`/`sports`/`role`**.

### 2b. Moments đang rỗng

`media[]` có 23 phần tử, **0 cái có `url`** — tất cả đang hiện nền gradient theo `tone` kèm chú thích.
Tab Moments là 1 trong 6 tab chính của rail. Thêm `"url": "https://…"` vào từng phần tử là hiện ngay
(`MediaTile` dùng thẻ `img` thường nên link nào cũng chạy). Xem mục "Ảnh / video" trong
`data/README-dc42.md`.

Cầu lông cũng chưa có ảnh hero — `public/hero/` chỉ có `bong-da-tunnel.jpg`.

---

## 3. Hiệu năng

### 3a. `public/` đang nặng 121MB

| File | Dung lượng |
|---|---|
| `public/hero/bong-da-tunnel.jpg` | **4.7MB** cho một ảnh hero |
| `public/players/**/*.png` | **1–1.6MB mỗi ảnh** (messi 1.27MB, emiliano-martinez 1.58MB, facundo-medina 1.61MB…) |

Web đang dùng **39 thẻ `<img>` và 0 chỗ `next/image`**. Việc nên làm:

- Nén hero sang WebP (~200–400KB là đủ) và chuyển sang `next/image` với `priority`.
- Nén loạt ảnh cầu thủ sang WebP. Có sẵn `scripts/normalize-avatars.py` để tham khảo.
- `next.config.mjs` đã khai `images` — kiểm tra lại trước khi chuyển sang `next/image` cho ảnh ngoài domain.

### 3b. 11 trang đang `force-dynamic` không cần thiết

Dữ liệu là `import` JSON tĩnh nhưng các trang này render lại server mỗi request:

```
app/page.js                            app/moments/page.js
app/the-thao/page.js                   app/su-kien/page.js
app/the-thao/[sport]/page.js           app/bang-tin/page.js
app/the-thao/[sport]/fantasy/page.js   app/xep-hang/page.js
```

Nên chuyển sang `export const revalidate = 3600` như các trang chi tiết đã làm
(`app/bang-tin/[slug]`, `app/su-kien/[slug]`, `app/the-thao/[sport]/giai-dau/[slug]`).

**Giữ `force-dynamic`** cho 2 trang có lý do thật:
- `app/the-thao/[sport]/giai-dau/page.js` — đọc `searchParams` (bộ lọc trạng thái / đơn vị)
- `app/the-thao/[sport]/giao-luu/page.js` — đọc điểm danh từ KV lúc runtime

Còn `app/fantasy`, `app/live` thì tuỳ: dữ liệu tới từ KV / API nên `force-dynamic` là hợp lý.

---

## 4. Test cho logic ngày tháng

Cả `lib/dc42.js` dựa vào `parseVn()` / `todayVn()` tự parse tay để Vercel (UTC) và máy local (+07) ra
cùng kết quả — chính comment đầu file cảnh báo điều này. Đây là chỗ dễ sai âm thầm nhất mà repo chỉ có
1 file test (`scripts/fantasy-sync-utils.test.mjs`).

Các hàm thuần nên viết test bằng `node --test`:

| Hàm | Cần khẳng định gì |
|---|---|
| `parseVn` / `todayVn` / `fmtDate` / `fmtTime` | Ra cùng kết quả khi `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` |
| `relativeDay` | "Hôm nay" / "Ngày mai" / "Còn N ngày" đúng biên |
| `upcomingSessions` | Sinh đúng 3 tuần tới, `sessionOverrides` ghi đè đúng, buổi huỷ vẫn hiện |
| `standingsOf` | Điểm → hiệu số → số bàn; bỏ qua trận `status != "done"` |
| `podiumOf` | Đúng 3 nhánh: có `champion` / có BXH / có `entries`; ghim `focusTeam` khi ngoài top 3 |
| `entryRunsOf` | Vòng xa nhất và cờ `alive` theo `win: "home"/"away"` |
| `attendanceRanking` / `allTimeScorers` | Cộng dồn đúng |

Thêm script vào `package.json`:

```
"test:dc42": "node --test lib/dc42.test.mjs"
```

---

## 5. Dọn nhỏ

- **`.claude/launch.json` đang giữ đường dẫn cứng máy này** (`C:/Users/hoang/node/node.exe`) và file
  này **được commit** → sẽ theo git sang máy người khác. Nên `.gitignore` nó, hoặc trả về
  `"runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"]` (sau khi restart Claude Code thì PATH mới
  đã có sẵn nên `"npm"` chạy được).
- **`v-cauLong-tb`** (CLB Cầu lông Bàu Cát) giờ không còn ai dùng, sau khi gộp cầu lông về một buổi T5
  ở Sân Đức Kim. Giữ hay xoá tuỳ bạn — `v-nhathidau` (NTĐ Phú Thọ) **phải giữ** vì giải TMA Badminton
  Open 2026 còn dùng.
- **`tma-football-cup-2025`** chỉ lưu `teams: ["t-dc42"]` trong khi `format` ghi "12 đội toàn công ty",
  nên thẻ giải phải bỏ dòng quy mô. Điền đủ `teams[]` nếu muốn thẻ nói đúng.
- **`logoWide` / `logoBg`** tôi thêm cho `predictionLeagues[]` nhưng hiện chưa giải nào dùng (cả hai
  logo đều vuông). Để sẵn cho logo nằm ngang / logo nét trắng về sau, hoặc xoá cho gọn.
- **Fantasy World Cup 2026 → mini game "Đội vô địch"** có `answer: null` nên web hiện "chờ kết quả" dù
  kèo đã có người thắng (Lý Minh Trí). Trận chung kết trong `data/db.json` vẫn là `TBD` nên không suy ra
  được — cần điền tay. Mini game "Vua phá lưới" thì đã có đáp án (Kylian Mbappé · 10 bàn, lấy từ
  `db.json → playerStats`) nhưng `winners` còn trống.

---

## Đã làm hôm nay (đừng làm lại)

- Cầu lông gộp còn **một buổi T5, 18:00–20:00, Sân Cầu Lông Đức Kim (Q.12)**: sửa `sessionTemplates`,
  thêm venue `v-duckim`, đổi `blurb`, viết lại bài `gop-cau-long-ve-thu-5`, dồn `attendanceLog` cầu lông
  về các thứ 5.
- Tab **"Dự đoán & Fantasy" → "Fantasy"**: route `/the-thao/[sport]/du-doan` → `/fantasy`; xoá hai giải
  dự đoán đứng riêng; dự đoán giờ là **mini game** khai trong `seasons[].predictions[]`.
- Logo giải: World Cup dùng `/fifa-world-cup-2026-logo.png`, FPL dùng `/logos/premier-league.png`.
- Trang **Giải đấu** dựng lại theo template EWC: `TournamentCard` (podium + bảng thông số + CTA tràn
  ngang), tab lọc gạch chân theo trạng thái kèm số đếm, `podiumOf()` trong `lib/dc42.js`.
- Sửa canh hàng thẻ Fantasy: `min-h` hàng chọn mùa, viền nút CTA, `mt-auto` khối mini game.
