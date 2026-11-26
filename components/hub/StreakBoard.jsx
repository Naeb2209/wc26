import { fmtDayMonth, memberName } from "@/lib/dc42";
import FlameIcon from "./FlameIcon";

/* "Giữ chuỗi" — ai có mặt liên tiếp nhiều buổi giao lưu nhất tính tới buổi vừa rồi.

   Đọc từ attendanceStreaks(): chuỗi tính trên sổ điểm danh đã chốt, nên khối này là
   bảng danh dự của người đi đều, không phải bảng người hay bấm nút. Vắng một buổi là
   chuỗi về 0 — lúc đó chỉ còn dòng kỷ lục cũ, coi như cái mốc phải đòi lại.

   Chưa buổi nào ghi sổ từ mốc `statsFrom` thì khối vẫn hiện, ở dạng mở hàng: giấu đi
   thì tuần đầu không ai biết có cái chuỗi mà giữ. */

const SHOWN = 5;

export default function StreakBoard({ data }) {
  if (!data) return null;

  // Mốc vừa đặt, chưa có buổi nào trong sổ -> mời mở hàng thay vì bảng trống.
  if (data.rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dc-gold/40 bg-dc-gold-soft px-5 py-4">
        <p className="flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-gold">
          <FlameIcon size={17} lit={false} />
          Giữ chuỗi
        </p>
        <p className="mt-1 text-[13px] text-dc-ink-2">
          Tính từ {data.from ? fmtDayMonth(data.from) : "tuần này"}, ai có mặt liên tiếp nhiều buổi nhất sẽ đứng đây.
          Chưa buổi nào vào sổ — tuần này là mở hàng, chuỗi của tất cả đang là 0.
        </p>
      </div>
    );
  }

  const rows = data.rows.slice(0, SHOWN);
  const skipped = data.skipped || [];
  // Nhiều tuần huỷ liên tiếp thì chỉ mượn lý do của tuần gần nhất, không liệt kê từng cái.
  const reason = skipped[0]?.reason || null;
  const top = rows[0];
  // Chưa ai nối được 2 buổi thì không có "chuỗi" nào để khoe — chuyển sang giọng rủ rê.
  const alive = top.streak >= 2;

  return (
    <div className="overflow-hidden rounded-2xl border border-dc-gold/40 bg-dc-gold-soft">
      {/* Cùng khuôn đầu thẻ với Vua farm gà để hai thẻ cạnh nhau thẳng hàng. */}
      <div className="px-5 pt-4">
        <p className="flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-gold">
          <FlameIcon streak={alive ? top.streak : 0} size={17} lit={alive} className="text-dc-gold" />
          Giữ chuỗi
        </p>
        <p className="mt-0.5 text-[13px] text-dc-ink-2">
          {alive
            ? `${data.holders} người đang có mặt liên tiếp từ 2 buổi trở lên.`
            : "Chưa ai nối được 2 buổi liền — tuần sau là mở hàng."}
        </p>
        <p className="mt-2 font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2 tabular-nums">
          Tính tới buổi {fmtDayMonth(data.last)} · {data.sessions} buổi đã ghi sổ
        </p>
      </div>

      {/* Tuần huỷ không tính vào chuỗi — nói thẳng ra, không thì người đọc tưởng sổ ghi thiếu. */}
      {skipped.length > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 px-5 text-[12.5px] text-dc-ink-2">
          <span className="material-symbols-outlined mt-px text-[15px] text-dc-gold">event_busy</span>
          <span>
            {skipped.map((s) => fmtDayMonth(s.date)).join(", ")} huỷ
            {reason ? ` (${reason.toLowerCase()})` : ""} nên không tính — chuỗi nối thẳng qua tuần đó.
          </span>
        </p>
      ) : null}

      {alive ? (
        /* Người giữ chuỗi dài nhất: tên to, số buổi to — giống ngôi vương của vua farm gà. */
        <div className="mt-3 flex items-center justify-between gap-4 bg-dc-gold px-5 py-3 text-white">
          <span className="min-w-0">
            <span className="block truncate font-dc-display text-[22px] font-bold leading-tight">
              {memberName(top.id)}
            </span>
            <span className="text-[12px] text-white/75 tabular-nums">
              Không nghỉ buổi nào từ {fmtDayMonth(top.since)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            {/* Trên dải vương miện lửa đi theo màu chữ trắng; độ dài chuỗi đọc ở con số bên cạnh. */}
            <FlameIcon streak={top.streak} size={32} className="text-white/85" />
            <span className="text-right font-dc-display text-[30px] font-bold leading-none tabular-nums">
              {top.streak}
              <span className="ml-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white/75">buổi</span>
            </span>
          </span>
        </div>
      ) : null}

      <ul className={`${alive ? "mt-1" : "mt-3"} flex flex-col px-5 pb-4`}>
        {(alive ? rows.slice(1) : rows).map((r, i) => (
          <li
            key={r.id}
            className="grid min-h-[37px] grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-dc-gold/20 py-2 text-[13.5px] last:border-b-0"
          >
            <span className="font-dc-display text-[11px] font-bold tabular-nums text-dc-ink-2">
              {i + (alive ? 2 : 1)}
            </span>
            <span className="min-w-0 truncate text-dc-ink">
              {memberName(r.id)}
              <span className="ml-2 text-[11.5px] tabular-nums text-dc-ink-2">
                {r.streak > 0 ? `${r.total} buổi trong sổ` : `đứt chuỗi · dài nhất ${r.best} buổi`}
              </span>
            </span>
            {/* Lửa nhỏ trước số: còn chuỗi thì đặc và lay, đứt chuỗi thì rỗng, xám, đứng yên. */}
            <span className="flex items-center gap-1.5">
              <FlameIcon streak={r.streak} size={16} lit={r.streak > 0} />
              <span
                className={`text-right font-dc-display font-bold tabular-nums ${
                  r.streak > 0 ? "text-dc-ink" : "text-dc-ink-2"
                }`}
              >
                {r.streak}
                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dc-ink-2">buổi</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
