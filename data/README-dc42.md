# Dữ liệu DC42 Hub

Toàn bộ nội dung các tab (trừ điểm danh) nằm trong `data/dc42.json`. Sửa file này rồi refresh — không cần
đụng tới code. Trang chi tiết được build tĩnh và tự làm mới mỗi giờ (`revalidate = 3600`).

## Hai nhánh nội dung tách rời

```
Thể thao  /the-thao
├── Bóng đá   /the-thao/bong-da
│   ├── Giao lưu hằng tuần      /the-thao/bong-da/giao-luu
│   ├── Giải đấu trong năm      /the-thao/bong-da/giai-dau[/<slug>]
│   └── Dự đoán & Fantasy       /the-thao/bong-da/du-doan
└── Cầu lông  /the-thao/cau-long
    ├── Giao lưu hằng tuần      /the-thao/cau-long/giao-luu
    └── Giải đấu trong năm      /the-thao/cau-long/giai-dau[/<slug>]

Sự kiện ngày đặc biệt  /su-kien[/<slug>]   ← Noel, 8/3, sinh nhật DC, trip, teambuilding
```

Rail chỉ có 6 tab: Trang chủ · **Thể thao** · **Sự kiện** · Xếp hạng · Moments · Bảng tin (+ More).
Tầng trong từng môn do thanh sub-nav (`components/hub/SportNav.jsx`) lo.

## Thêm một môn mới

Thêm một phần tử vào `sports[]` là có ngay hub + hai trang con:

```json
{
  "id": "basketball",
  "slug": "bong-ro",
  "name": "Bóng rổ",
  "icon": "sports_basketball",
  "tone": "court",
  "blurb": "Một dòng mô tả hiện ở hub Thể thao.",
  "hasPrediction": false
}
```

`hasPrediction: true` mới hiện tab "Dự đoán & Fantasy" (hiện chỉ bóng đá). Muốn môn mới có màu riêng
thì thêm khoá vào `SPORT_META` trong `components/hub/ui.jsx` và token `dc-*` trong `tailwind.config.js`;
không thêm thì dùng màu trung tính, không vỡ.

## Bốn loại nội dung

| Loại | Key trong JSON | Thuộc nhánh | Sinh ra trang nào |
|---|---|---|---|
| Giải đấu | `tournaments[]` (có `sport`) | Thể thao › môn | Giải đấu trong năm, Xếp hạng, Trang chủ |
| Buổi giao lưu | `sessionTemplates[]` (có `sport`) | Thể thao › môn | Giao lưu hằng tuần, Trang chủ |
| Dự đoán / Fantasy | `predictionLeagues[]` (có `sport`) | Thể thao › môn | Dự đoán & Fantasy, Xếp hạng |
| Sự kiện đặc biệt | `events[]` | Sự kiện | Sự kiện, Trang chủ |

Bốn loại trên dùng chung ba tầng cắt ngang: `media[]` (ảnh/video), `attendanceLog[]` (chuyên cần),
`honours[]` (danh hiệu). Trường `sport` quyết định hoạt động nằm dưới môn nào — sai `sport` là trang
sẽ 404 vì đường dẫn lệch môn bị chặn có chủ ý.

## Thêm một buổi giao lưu mới

Buổi giao lưu **không nhập từng buổi** — chỉ khai báo mẫu lặp, hệ thống tự sinh ba tuần tới:

```json
{
  "id": "st-football-sun",
  "sport": "football",
  "title": "Đá sáng chủ nhật",
  "weekday": 0,              // 0 = CN, 1 = T2, … 6 = T7
  "start": "07:00",
  "end": "08:30",
  "venueId": "v-causuoi",    // phải khớp một id trong venues[]
  "capacity": 12,
  "fee": 60000,              // 0 = miễn phí
  "host": "m01",
  "note": "Sân 5, nhớ mang nước.",
  "regulars": ["m01", "m03"] // mặc định coi như đã đăng ký
}
```

Huỷ hoặc đổi một buổi cụ thể thì thêm vào `sessionOverrides[]`:

```json
{ "templateId": "st-football-thu", "date": "2026-09-09", "cancelled": true, "reason": "Sân sửa mặt cỏ" }
```

Override cũng ghi đè được `venueId`, `start`, `end`, `capacity`, `note`.

## Thêm một giải

- `status`: `running` | `finished` | `upcoming`
- `host`: `"DC"` hoặc `"TMA"` (dùng cho bộ lọc đơn vị)
- Bóng đá: khai `teams[]` + `matches[]` có `home`/`away`/`hs`/`as` → **BXH tự tính**, không nhập tay điểm.
  `goals: [{ "m": "m03", "n": 2 }]` nuôi bảng vua phá lưới.
- Cầu lông: khai `entries[]` (các cặp của DC) + `matches[]` dạng `score: "2-1 (21-17, …)"`.
- Giải cũ không còn dữ liệu từng trận: bỏ trống `matches`, điền `champion` / `runnerUp` / `topScorer`.
- `roster[]`: danh sách `member id` đăng ký mùa đó → hiện khối "Đội hình mùa này" (số áo lấy từ `number` của member,
  số bàn tự tính từ `goals` trong `matches`). Không khai thì khối này ẩn.
- `focusTeam`: id một đội → khối "Lịch & kết quả" chỉ liệt kê trận của đội đó (dùng cho giải của TMA, không phải giải DC tự tổ
  chức). BXH và số trận ở phần đầu trang vẫn tính đủ các đội.
- `standingNote`: dòng chú thích dưới BXH. Không khai thì dùng câu mầu "hai đội dẫn đầu vào chung kết".

## Thêm một sự kiện

`status: "upcoming"` thì hiện ở khối đầu trang Sự kiện và trong "Sắp diễn ra" ở Trang chủ;
`"past"` thì rơi xuống dòng thời gian theo năm. Trước sự kiện dùng `program[]`, sau sự kiện dùng `recap`.

## Ảnh / video

```json
{ "id": "md25", "activity": "trip-da-lat-2025", "type": "image", "caption": "…", "by": "m02", "tone": 3 }
```

- `activity` phải trùng `slug` của một sự kiện hoặc một giải — album tự gắn vào đúng trang đó **và**
  hiện trong tab Moments, không cần khai báo album riêng.
- Chưa có link ảnh thật: bỏ trống, ô sẽ hiện nền chuyển sắc theo `tone` (1–6) kèm chú thích.
- Có link rồi: thêm `"url": "https://…"`. Ảnh ngoài domain cần khai trong `next.config.mjs` nếu chuyển
  sang `next/image`; hiện `MediaTile` dùng thẻ `img` thường nên link nào cũng chạy.

## Điểm danh (phần duy nhất không nằm trong JSON)

Lưu ở Upstash/Vercel KV theo key `dc42:rsvp:<templateId>@<YYYY-MM-DD>`, chỉ ghi phần khác mặc định.
Chưa cấu hình KV (`UPSTASH_REDIS_REST_URL` + token, hoặc `KV_REST_API_*`) thì lưu tạm trong bộ nhớ
tiến trình — bấm được nhưng mất khi restart và không chia sẻ giữa các instance. Trang Giao lưu có
báo trạng thái này ngay trên đầu.

Chưa có đăng nhập: mỗi người tự chọn tên mình một lần, lưu ở `localStorage["dc42:me"]`. Khi nối SSO thì
thay chỗ chọn tên trong `components/hub/SessionList.jsx` bằng danh tính thật.

## Dự đoán & Fantasy

`predictionLeagues[]` là phần chơi cùng giải bên ngoài, **không phải** giải DC tự tổ chức.
Mỗi phần tử là **một giải gom nhiều mùa** trong `seasons[]` — thẻ trên web có sẵn bộ chọn mùa:

```json
{
  "slug": "fpl",
  "name": "Fantasy Premier League",
  "kind": "Fantasy",          // "Fantasy" hoặc "Dự đoán" -> quyết định nhóm trên trang
  "sport": "football",
  "note": "Mô tả chung của giải (dùng khi mùa không có note riêng).",
  "seasons": [
    {
      "id": "2026-27",        // duy nhất trong giải, dùng cho state của bộ chọn
      "label": "26/27",       // nhãn ngắn trên pill
      "season": "2026/27",    // nhãn đầy đủ
      "status": "running",    // running | upcoming | finished | planned
      "href": null,           // null = chưa có bảng điểm; có link thì hiện nút "Mở bảng điểm"
      "players": 12,
      "champion": null,       // điền khi mùa đã xong -> hiện chip vô địch
      "note": "Ghi chú riêng của mùa này."
    }
  ]
}
```

Mùa nên xếp **mới nhất trước**. Mùa hiện ra mặc định do `defaultSeasonOf()` chọn theo thứ tự
ưu tiên `running` → `upcoming` → `finished` → `planned`, cùng mức thì lấy mùa mới hơn.

Thêm mùa mới cho FPL = thêm một phần tử vào `seasons[]`, không tạo giải mới. Khi mùa nào làm xong
bảng điểm thì trỏ `href` tới trang tương ứng — hiện chỉ `fantasy-world-cup` mùa `2026` có
`href: "/fantasy"` (module Fantasy World Cup đã dựng sẵn). Bộ chọn mùa trên trang `/fantasy`
(`components/hub/FantasySeasonBar.jsx`) liệt kê mọi mùa Fantasy, mùa chưa có bảng điểm để disabled.

## Chuyên cần & danh hiệu

- `attendanceLog[]`: mỗi dòng là một buổi đã diễn ra `{ date, sport, members: [...] }` → nuôi bảng
  chuyên cần ở tab Xếp hạng. Hiện phải nhập tay; khi điểm danh chạy ổn định thì có thể sinh tự động
  từ KV vào cuối mỗi buổi.
- `honours[]`: cúp và danh hiệu theo năm. `kind: "member"` thì `winner` là id thành viên,
  `kind: "team"` thì `winner` là tên đội dạng chữ.
