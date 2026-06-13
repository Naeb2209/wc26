# Avatar cầu thủ

Mỗi đội tuyển có một thư mục riêng theo **mã đội** (ví dụ `ENG/`, `ARG/`).
Bỏ ảnh chân dung cầu thủ vào đúng thư mục của đội đó.

## Cách thêm ảnh

1. Mở thư mục đội theo mã ở bảng bên dưới (ví dụ đội Anh → `public/players/ENG/`).
2. Bỏ file ảnh vào, đặt tên theo dạng **không dấu, viết thường, nối bằng gạch ngang**:
   - `Harry Kane` → `harry-kane.webp`
   - `Kylian Mbappé` → `kylian-mbappe.webp`
3. Định dạng nên dùng: **`.webp`** hoặc `.png` (nền trong suốt, khung đầu + thân giống ảnh mẫu của Kane).

## Cách để web hiển thị ảnh

Ảnh trong thư mục này được truy cập qua đường dẫn `/players/<MÃ_ĐỘI>/<tên-file>`.
Sau khi bỏ ảnh vào, mở `data/db.json`, tìm cầu thủ tương ứng và đặt trường `avatar`:

```json
"avatar": "/players/ENG/harry-kane.webp",
```

> Mẹo: nếu bạn bỏ một loạt ảnh vào và muốn mình tự gán hàng loạt vào `db.json`,
> chỉ cần báo tên đội — mình sẽ map theo tên file ↔ tên cầu thủ.

## Bảng mã đội

| Mã | Đội tuyển |
|----|-----------|
| ALG | Algeria |
| ARG | Argentina |
| AUS | Australia |
| AUT | Austria |
| BEL | Belgium |
| BIH | Bosnia-H. |
| BRA | Brazil |
| CAN | Canada |
| CPV | Cape Verde |
| COL | Colombia |
| COD | Congo DR |
| CRO | Croatia |
| CUW | Curaçao |
| CZE | Czechia |
| ECU | Ecuador |
| EGY | Egypt |
| ENG | England |
| FRA | France |
| GER | Germany |
| GHA | Ghana |
| HAI | Haiti |
| IRN | Iran |
| IRQ | Iraq |
| CIV | Ivory Coast |
| JPN | Japan |
| JOR | Jordan |
| KOR | Korea Republic |
| MEX | Mexico |
| MAR | Morocco |
| NED | Netherlands |
| NZL | New Zealand |
| NOR | Norway |
| PAN | Panama |
| PAR | Paraguay |
| POR | Portugal |
| QAT | Qatar |
| KSA | Saudi Arabia |
| SCO | Scotland |
| SEN | Senegal |
| RSA | South Africa |
| ESP | Spain |
| SWE | Sweden |
| SUI | Switzerland |
| TUN | Tunisia |
| TUR | Turkey |
| URY | Uruguay |
| USA | USA |
| UZB | Uzbekistan |
