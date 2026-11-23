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

`hasPrediction: true` mới hiện tab "Fantasy" (hiện chỉ bóng đá). Khoá tuỳ chọn `statsFrom`
("YYYY-MM-DD") là mốc tính lại các bảng nội bộ của môn — xem "Bảng nội bộ & mốc tính lại".
Muốn môn mới có màu riêng
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

### Tài khoản đăng nhập

Muốn điểm danh thì phải đăng nhập. Tài khoản khai trong `accounts[]`, mỗi dòng buộc một
tên đăng nhập với một member:

```json
"accounts": [
  { "u": "quan", "m": "m01" },
  { "u": "hoanganh", "m": "m02" }
]
```

- `u`: tên đăng nhập, viết thường không dấu. `m`: id trong `members[]`.
- Người chưa có trong `accounts[]` **tự đăng ký** trên trang Giao lưu (nút Đăng ký). Tài
  khoản đó lưu ở KV (`dc42:accounts`), không nằm trong file này.
- **Mỗi người một mật khẩu riêng**, hash scrypt lưu ở KV (`dc42:passwords`).
- **Mật khẩu nhóm** `DC42_PASSWORD` (mặc định `123`) chỉ còn hai việc: làm cửa chặn lúc đăng
  ký, và cho tài khoản trong `accounts[]` chưa có mật khẩu riêng vào lần đầu. Vào xong hub bắt
  đặt mật khẩu riêng mới cho điểm danh; đặt rồi thì mật khẩu nhóm không mở được tài khoản đó.
- `DC42_AUTH_SECRET` là khoá ký cookie phiên — **phải đặt khi deploy thật**, không thì
  dùng khoá dev ai cũng đoán được và tự ký cookie thành người khác.
- Phiên lưu ở cookie httpOnly 30 ngày. Đặt/đổi mật khẩu thì mọi cookie cũ của tài khoản đó
  hết hiệu lực. API `/api/rsvp` lấy memberId từ cookie chứ không lấy từ body.

**Quên mật khẩu:** thêm username kèm mốc giờ vào `passwordResets` ở gốc file này rồi deploy.
Mật khẩu đặt trước mốc đó bị bỏ qua — người đó vào lại bằng mật khẩu nhóm và đặt cái mới:

```json
"passwordResets": { "bean": "2026-11-23T20:00:00+07:00" }
```

### Bốc thăm chia đội (bóng đá)

Mẫu buổi bóng đá khai `"splitTeams": 2` (hoặc 3). Trước giờ đá **2 tiếng**, thẻ buổi đếm
ngược; hết giờ thì điểm danh khoá lại và đội bốc ra hiện luôn.

**Cách nhanh nhất: khai thẳng POT.** Ban tổ chức tự xếp pot thì bỏ `pots` vào override của
ngày đó, mỗi pot là một mảng. Phần tử nhận cả memberId lẫn tên viết thẳng, nên người lạ chưa
có trong `members[]` vẫn bốc được và hiện đúng như khai:

```json
{
  "templateId": "st-football-thu",
  "date": "2026-11-04",
  "capacity": 18,
  "splitTeams": 3,
  "pots": [
    ["Huy", "SV", "con chim đen"],
    ["Bean", "Duy", "Đông"]
  ]
}
```

Khai `pots` rồi thì `tier` và danh sách điểm danh không còn ảnh hưởng tới việc chia — pot
nói gì thì bốc nấy. Số người mỗi pot nên bằng số đội; pot lẻ người thì ai dư về đội ít nhất.

Không khai `pots` thì hub tự suy ra từ trình độ. Cách chia: mỗi cầu thủ có `"tier"` trong `members[]` (1 = cứng nhất). Người đi được xếp
theo tier rồi cắt thành từng POT đúng bằng số đội — POT 1 là nhóm cứng nhất. Mỗi POT quay
random rồi rải mỗi đội một người, nên đội nào cũng có đúng một người ở mỗi mức trình độ.
POT cuối lẻ người thì ai dư về đội đang ít người nhất.

Nguồn ngẫu nhiên là **drand** — beacon công khai, 3 giây một round. Hub lấy đúng round được
công bố tại mốc chốt: trước giờ đó không ai biết nó là số mấy, sau giờ đó ai tra cũng ra cùng
một số. Nhờ vậy kết quả vừa không đoán trước được, vừa giống nhau ở mọi máy mà không phải lưu
gì; cuối khối có link tới đúng round để ai muốn cũng kiểm chứng lại được.

Gọi drand hỏng (mạng chặn, beacon chưa ra) thì rơi về seed dự phòng tính từ id buổi + danh
sách đi — vẫn giống nhau ở mọi máy, chỉ kém ở chỗ ai đọc code thì tính trước được; khối sẽ
nói rõ là đang dùng bản dự phòng.

Hiệu ứng chạy theo lịch cố định tính từ mốc chốt, nên ai mở cùng lúc thì xem cùng một lượt
quay; vào muộn thì các lượt đã qua hiện thẳng, không tua lại. Không khai `tier` thì coi như
yếu nhất, rơi vào POT cuối.

Mặc định chốt trước giờ đá 2 tiếng (`SPLIT_LEAD_MS` trong `lib/dc42.js`). Một buổi cần giờ
khác thì khai `"split": "16:30"` trong override của ngày đó — lấy đúng giờ đã khai, không lùi
theo giờ đá nữa.

### Chia đội và kết quả một buổi

Buổi đã đá thì khai `teams[]` (2 hoặc 3 đội) + `matches[]` vào chính override của ngày đó.
**Bảng xếp, hiệu số và danh sách ghi bàn tự tính từ `matches`** — không nhập tay con số nào:

```json
{
  "templateId": "st-football-thu",
  "date": "2026-10-28",
  "teams": [
    { "id": "do", "name": "Đỏ", "color": "red", "members": ["m01", "m03", "m10"] },
    { "id": "xanh", "name": "Xanh", "color": "blue", "members": ["m02", "m06", "m12"] },
    { "id": "vang", "name": "Vàng", "color": "yellow", "members": ["m05", "m08"] }
  ],
  "matches": [
    { "a": "do", "b": "xanh", "as": 3, "bs": 2, "goals": [{ "m": "m03", "n": 2 }, { "m": "m01" }] },
    { "a": "do", "b": "vang", "as": 2, "bs": 4, "goals": [{ "m": "m10", "n": 2 }] }
  ]
}
```

- `a` / `b` trỏ tới `teams[].id`; `as` / `bs` là tỉ số trận đó. Ba đội thì cứ khai đủ các cặp đã đá.
- `goals`: `{ "m": "<memberId>", "n": <số bàn> }`, bỏ `n` nghĩa là 1 bàn.
- `color`: `red` · `blue` · `yellow` · `green` · `light` · `dark` — chỉ để chấm màu trước tên đội.
- Điểm: thắng 3, hoà 1. Xếp theo điểm → hiệu số → số bàn thắng.
- Cầu lông dùng đúng cấu trúc này, chỉ khác chữ hiển thị: "bàn" đổi thành "điểm".
- Chỉ buổi đã qua mới hiện khối kết quả; buổi sắp tới vẫn là khối điểm danh.
- Hai đội thì chỉ hiện tỉ số giữa hai bên; ba đội mới hiện bảng xếp và cột hiệu số.
- Mục **Vua farm gà** ở trang Giao lưu cộng `goals` của mọi buổi trong năm gần nhất
  có kết quả. Buổi không khai `matches` thì không tính, nên muốn ai đó lên bảng vàng
  phải khai kết quả buổi đó.

## Thêm một giải

- `status`: `running` | `finished` | `upcoming`
- `host`: `"DC"` hoặc `"TMA"` (dùng cho bộ lọc đơn vị)
- Bóng đá: khai `teams[]` + `matches[]` có `home`/`away`/`hs`/`as` → **BXH tự tính**, không nhập tay điểm.
  `goals: [{ "m": "m03", "n": 2 }]` nuôi bảng vua phá lưới.
- Cầu lông: khai `entries[]` (các cặp của DC) + `matches[]` dạng `score: "2-1 (21-17, …)"`.
- Giải cũ không còn dữ liệu từng trận: bỏ trống `matches`, điền `champion` / `runnerUp` / `topScorer`.
- `roster[]`: danh sách người đăng ký mùa đó → hiện khối "Đội hình mùa này", số bàn tự tính từ `goals`
  trong `matches`. Không khai thì khối này ẩn. **Số áo đổi theo từng mùa**, nên mỗi phần tử nhận hai dạng:

  ```json
  "roster": [
    { "m": "m29", "number": "5" },   // số áo của riêng mùa này, đè lên số mặc định
    "m31"                             // không khai số -> lấy `number` của member
  ]
  ```

  Trộn hai dạng trong cùng một `roster[]` cũng chạy. Số ở `members[]` chỉ là số mặc định, dùng khi mùa
  không khai — cùng một người có thể mang #74 mùa 2024 và #9 mùa 2025.
- `focusTeam`: id một đội → khối "Lịch & kết quả" chỉ liệt kê trận của đội đó (dùng cho giải của TMA, không phải giải DC tự tổ
  chức). BXH và số trận ở phần đầu trang vẫn tính đủ các đội. Trên **thẻ giải** ở trang danh sách, nếu đội này nằm
  ngoài top 3 thì vẫn được ghim thêm một dòng (nền gold nhạt) để biết DC đang đứng đâu.
- `focusTeams`: mảng id, dùng khi DC góp **nhiều đội** trong cùng một giải (DG7 League Cup: hai đội mỗi mùa).
  Mọi chỗ đọc `focusTeam` đều đi qua `focusTeamsOf()` nên khai dạng nào cũng chạy; đội nào ngoài top 3 cũng
  được ghim riêng một dòng.
- Mùa gõ tay từ bản tường thuật có thể **không có ngày**: bỏ hẳn `startDate` / `endDate` và `date` của từng
  trận, chỉ giữ `round`. Thẻ giải tự giấu dòng "Thời gian", ô stat nói mùa thay cho ngày, và trận không ngày
  thì không lọt vào "Kết quả gần nhất" (không xếp được vào dòng thời gian).
- `standingNote`: dòng chú thích dưới BXH. Không khai thì dùng câu mầu "hai đội dẫn đầu vào chung kết".

### Giải nhiều mùa (bộ chọn mùa)

Giải chạy lại hằng năm thì **mỗi mùa vẫn là một phần tử `tournaments[]` riêng** — BXH, lịch, đội hình
tính theo mùa, không trộn. Thứ gom chúng lại thành một giải là khoá `league`:

```json
"leagues": [
  { "id": "tma-futsal-league", "name": "TMA Futsal League", "sport": "football",
    "blurb": "Giải futsal thường niên của TMA. Mỗi năm là một mùa, DC góp một đội." }
]
```

Rồi mỗi mùa khai thêm hai trường:

| Trường | Ý nghĩa |
|---|---|
| `league` | id một phần tử trong `leagues[]`. Hai mùa cùng `league` → gộp thành một thẻ có bộ chọn mùa |
| `division` | hạng/bảng của mùa đó, vd `"League B"` → hiện thành chip cạnh đơn vị tổ chức |

Có từ **hai mùa trở lên** mới sinh bộ chọn mùa (`components/hub/SeasonPicker.jsx`). Khi đó:

- Trang `giai-dau` chỉ hiện **một thẻ** mang tên giải trong `leagues[]`, không phải một thẻ mỗi mùa.
  Thẻ hiện số liệu của **mùa đại diện** — mùa đầu tiên còn lại sau bộ lọc trạng thái/đơn vị, nên lọc
  "Đã kết thúc" thì thẻ tự nhảy sang mùa đã xong. Pill mùa còn lại là link sang trang mùa đó.
- Trang chi tiết lấy tên giải làm tiêu đề, mùa nằm ở dòng eyebrow, kèm khối bộ chọn mùa ở đầu trang.
- Đếm "N giải" ở hub môn và tab trạng thái đếm **theo giải**, không theo mùa.

Mùa mới = thêm một phần tử `tournaments[]` với `league` cũ. Giải chỉ có một mùa thì bỏ hẳn `league`,
mọi thứ chạy y như trước.

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

Bốn trường tuỳ chọn dành cho sự kiện cần kêu gọi đăng ký (vd hội thao công ty) — không khai thì khối tương ứng ẩn:

| Trường | Hiện ở đâu |
|---|---|
| `dateNote` | Dòng phụ dưới ô *Thời gian*, dùng khi lịch mới là dự kiến |
| `lineup[]` | Khối *Bộ môn* — mỗi phần tử `{ name, icon?, note? }`, `icon` là tên Material Symbols |
| `deadline` | Dòng hạn chót trong thẻ *Đăng ký*, kèm đếm ngược (cần `rsvp: true`) |
| `registerNote` | Thay câu mặc định trong thẻ *Đăng ký* — ghi rõ đăng ký ở đâu |

### Trang trí riêng cho từng sự kiện

Mỗi sự kiện có trang riêng `/su-kien/<slug>` với bảng màu và hoạ tiết nền riêng, khai báo ở
[`lib/eventThemes.js`](../lib/eventThemes.js). Thứ tự khớp theme: `event.theme` (ghi thẳng trong
JSON) → tiền tố slug → `type` → mặc định.

Theme có sẵn: `trung-thu` (trăng, lồng đèn), `noel` (tuyết rơi, thông), `du-lich` (núi, mây),
`teambuilding` (biển, sóng), `quoc-te-phu-nu` (cánh hoa), `sinh-nhat` (confetti),
`hoi-thao` (đèn sân khấu, dụng cụ các bộ môn — dùng cho hội thao TMA).

Nhờ khớp theo tiền tố slug nên `trung-thu-2027` tự ăn theme `trung-thu`, không cần sửa gì. Muốn
làm theme mới thì thêm một mục vào `THEMES` (màu + `decor`) và một cảnh SVG cùng tên `decor`
trong [`components/hub/EventDecor.jsx`](../components/hub/EventDecor.jsx).

## Ảnh / video

```json
{ "id": "md25", "activity": "trip-da-lat-2025", "type": "image", "caption": "…", "by": "m02", "tone": 3 }
```

- `activity` phải trùng `slug` của một sự kiện hoặc một giải — album tự gắn vào đúng trang đó **và**
  hiện trong tab Moments, không cần khai báo album riêng.
- Chưa có link ảnh thật: bỏ trống, ô sẽ hiện nền chuyển sắc theo `tone` (1–6) kèm chú thích.
- Có link rồi: thêm `"url": "https://…"`. Ảnh ngoài domain cần khai trong `next.config.mjs` nếu chuyển
  sang `next/image`; hiện `MediaTile` dùng thẻ `img` thường nên link nào cũng chạy.
- File nội bộ để ở `public/media/<slug hoạt động>/01.webp` (clip thì `.mp4`) rồi khai
  `"url": "/media/<slug>/01.webp"` — thay ảnh sau này chỉ cần ghi đè đúng tên file.
- `"type": "video"` có `url` thì dải DC Moments ở trang chủ tự chạy clip, câm và lặp, lấy luôn khung
  hình đầu làm bìa; ô ngang (ô to nhất dải) ưu tiên dành cho clip.
- `"pin"` đặt mục vào đúng chỗ trong dải DC Moments: `true` là ô đầu, số là ô thứ mấy (`"pin": 2`
  là ô thứ hai). Dải vốn xếp theo ngày hoạt động, nên đây là cách khoe một tấm cũ mà không phải sửa
  ngày của cả album. Lưu ý ô ngang vẫn ưu tiên clip, nên số thứ tự đếm trên danh sách mục chứ không
  phải trên các cột đã dựng.

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
  `kind: "team"` thì `winner` là tên đội dạng chữ. Giải đồng đội của nhiều người ngang hàng thì
  dùng `winners: ["m30", "m32"]` thay cho `winner` — phần tử là id thành viên hoặc tên viết tay
  cho người chưa có trong `members[]`. Khai thêm `tournament: "<slug giải>"` thì thẻ có nút
  "Xem giải →". Môn chỉ xuất hiện ở đây (vd `running`) không cần nằm trong `sports[]`, chỉ cần
  một mục trong `SPORT_META` của `components/hub/ui.jsx` để chip có tên và icon.
  `rank: "gold" | "silver" | "bronze"` quyết định vạch màu, viền và icon của thẻ — để trống cho
  giải phụ (phong cách, khuyến khích) thì thẻ ở tông trung tính.

## Bảng nội bộ & mốc tính lại

Tab Giao lưu có hai bảng vàng của riêng sân nhà, cùng đọc từ dữ liệu buổi:

- **Vua farm gà** — ai ghi nhiều nhất ở các buổi nội bộ, tính từ `matches[]` trong `sessionOverrides`.
- **Giữ chuỗi** — ai có mặt liên tiếp nhiều buổi nhất, tính từ `attendanceLog[]`. Vắng một buổi là
  chuỗi về 0, nhưng buổi khai `cancelled: true` (và dòng sổ rỗng người) **không** phải một mắt xích:
  mưa huỷ sân thì không ai đáng bị đứt chuỗi, chuỗi nối thẳng qua tuần đó.

Muốn tính lại từ đầu thì khai `statsFrom: "YYYY-MM-DD"` trong `sports[]` của môn đó — cả hai bảng
và cả bảng chuyên cần ở tab Xếp hạng đều bỏ qua mọi buổi trước mốc, không phải xoá sổ cũ. Chưa có
buổi nào sau mốc thì hai khối vẫn hiện ở dạng mở hàng thay vì biến mất.

Bật/tắt hai bảng cho từng môn ở `INTERNAL_BOARDS` trong `app/the-thao/[sport]/giao-luu/page.js` —
môn nào chưa ghi sổ đều tay thì để ngoài, còn hơn bày ra con số sai.
