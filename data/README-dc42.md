# Dữ liệu DC42 Hub

Toàn bộ nội dung các tab (trừ điểm danh) nằm trong `data/dc42.json`. Sửa file này rồi refresh — không cần
đụng tới code. Trang chi tiết được build tĩnh và tự làm mới mỗi giờ (`revalidate = 3600`).

## Hai nhánh nội dung tách rời

```
Thể thao  /the-thao
├── Bóng đá   /the-thao/bong-da
│   ├── Giao lưu hằng tuần      /the-thao/bong-da/giao-luu
│   ├── Giải đấu trong năm      /the-thao/bong-da/giai-dau[/<slug>]
│   └── Fantasy                 /the-thao/bong-da/fantasy
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

`hasPrediction: true` mới hiện tab "Fantasy" (hiện chỉ bóng đá). Muốn môn mới có màu riêng
thì thêm khoá vào `SPORT_META` trong `components/hub/ui.jsx` và token `dc-*` trong `tailwind.config.js`;
không thêm thì dùng màu trung tính, không vỡ.

## Bốn loại nội dung

| Loại | Key trong JSON | Thuộc nhánh | Sinh ra trang nào |
|---|---|---|---|
| Giải đấu | `tournaments[]` (có `sport`) | Thể thao › môn | Giải đấu trong năm, Xếp hạng, Trang chủ |
| Buổi giao lưu | `sessionTemplates[]` (có `sport`) | Thể thao › môn | Giao lưu hằng tuần, Trang chủ |
| Fantasy | `predictionLeagues[]` (có `sport`) | Thể thao › môn | Fantasy, Xếp hạng |
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
  chức). BXH và số trận ở phần đầu trang vẫn tính đủ các đội. Trên **thẻ giải** ở trang danh sách, nếu đội này nằm
  ngoài top 3 thì vẫn được ghim thêm một dòng (nền gold nhạt) để biết DC đang đứng đâu.
- `standingNote`: dòng chú thích dưới BXH. Không khai thì dùng câu mầu "hai đội dẫn đầu vào chung kết".

### Khối podium trên thẻ giải

Thẻ giải ở `/the-thao/[môn]/giai-dau` có một khối bảng ngắn, `podiumOf()` trong `lib/dc42.js` tự chọn
nội dung theo dữ liệu sẵn có — không khai thêm gì:

| Trường hợp | Khối hiện gì |
|---|---|
| Có `champion` | *Kết quả cuối* — Vô địch / Á quân, hàng vô địch tô gold |
| `standingsOf()` ra bảng (bóng đá có `teams` + `matches`) | *Bảng xếp hạng hiện tại* — top 3 + dòng ghim `focusTeam` |
| Có `entries[]` (cầu lông loại trực tiếp) | *Các cặp của DC* — vòng đi xa nhất, cặp còn trong giải nền gold nhạt |
| Không có gì ở trên | Ẩn khối |

Dòng *Quy mô* chỉ nói "N đội" khi `teams[]` lưu đủ các đội (> 1). Giải của TMA mà chỉ lưu đúng đội DC
(vd `tma-football-cup-2025`) thì bỏ số đội, chỉ nói số trận — tránh hiện "1 đội" sai lệch.

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

## Fantasy

`predictionLeagues[]` là phần chơi cùng giải bên ngoài, **không phải** giải DC tự tổ chức.
Mỗi phần tử là **một giải gom nhiều mùa** trong `seasons[]` — thẻ trên web có sẵn bộ chọn mùa:

```json
{
  "slug": "fpl",
  "name": "Fantasy Premier League",
  "kind": "Fantasy",
  "sport": "football",
  "logo": "/logos/premier-league.png",  // xem mục "Logo giải" bên dưới
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
      "note": "Ghi chú riêng của mùa này.",
      "predictions": []       // mini game dự đoán kèm theo mùa này, xem mục dưới
    }
  ]
}
```

### Mini game dự đoán nằm trong mùa, không phải giải riêng

Dự đoán **không có tab riêng**. Mỗi mùa Fantasy tự khai `predictions[]` — các mini game ăn theo giải đó
(đội vô địch, vua phá lưới, hậu vệ ghi bàn nhiều nhất…), hiện thành khối "Mini game dự đoán"
ngay trong thẻ giải:

```json
{
  "id": "champion",              // duy nhất trong mùa
  "question": "Đội vô địch",     // câu hỏi hiện trên web
  "icon": "emoji_events",        // tên icon Material Symbols, bỏ trống -> "casino"
  "status": "open",              // open = đang mở | finished = đã có kết quả
  "players": 12,
  "answer": null,                // đáp án thật; null -> web hiện "đang mở" / "chờ kết quả"
  "winners": [],                 // tên người đoán đúng -> hiện chip vàng
  "note": "Chốt dự đoán trước vòng 5."
}
```

Mùa không có mini game thì bỏ `predictions` hoặc để `[]` — khối tự ẩn.

### Logo giải

Đặt file vào `public/logos/` rồi khai đường dẫn tuyệt đối trong `logo`. Ba trường, hai trường sau
đều tùy chọn:

| Trường | Ý nghĩa |
|---|---|
| `logo` | Đường dẫn file, vd `/logos/premier-league.svg`. Không khai → dùng ô icon theo tông màu giải |
| `logoWide` | `true` cho logo nằm ngang (lockup lân + chữ) → ô rộng, cao 40px (mobile) / 48px |
| `logoBg` | `"dark"` cho logo vẽ bằng mực trắng → ô nền mực, để nét trắng không mất hút trên thẻ trắng |

Logo hiện ở ba chỗ: thẻ lớn trang Fantasy (`components/hub/LeagueCard.jsx`), thẻ nhỏ ở tổng quan môn
và trang Xếp hạng (`LeagueLogo` trong `components/hub/ui.jsx`). File thiếu thì thẻ lớn tự rơi về ô
icon, không hiện ảnh vỡ.

Đang dùng: `fantasy-world-cup` → `/fifa-world-cup-2026-logo.png`, `fpl` → `/logos/premier-league.png`
(bản chỉ đầu lân, hình vuông). Cả hai đều là logo vuông nên chưa giải nào cần `logoWide` /
`logoBg` — hai trường đó để sẵn cho logo nằm ngang hoặc logo nét trắng về sau.

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
