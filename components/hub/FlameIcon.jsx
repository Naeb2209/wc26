/* Ngọn lửa của khối "Giữ chuỗi".

   Vẫn là Material Symbols như mọi icon khác của hub, chỉ mượn thêm hai thứ sẵn có:
   trục FILL của font biến thiên (còn chuỗi -> lửa đặc, đứt chuỗi -> lửa rỗng, đúng
   lối rail dùng để đánh dấu mục đang mở) và sắc vàng/mực để chuỗi dài ngắn đọc được
   bằng màu mà không phải dò số. Phần lửa lay nằm ở .dc-flame trong globals.css. */

// Chuỗi càng dài lửa càng đậm: vàng hub -> vàng nhạt -> mực nhạt -> xám khi tắt.
function heat(streak, lit) {
  if (!lit) return "text-dc-ink-2/40";
  if (streak >= 6) return "text-dc-gold";
  if (streak >= 3) return "text-dc-gold/75";
  return "text-dc-ink-2";
}

export default function FlameIcon({ streak = 1, size = 16, lit = true, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined shrink-0 ${lit ? "dc-flame" : ""} ${
        className || heat(streak, lit)
      }`}
      style={{
        fontSize: size,
        fontVariationSettings: `"FILL" ${lit ? 1 : 0}, "wght" ${lit ? 500 : 400}, "GRAD" 0, "opsz" 24`,
      }}
    >
      local_fire_department
    </span>
  );
}
