import { fmtDayMonth, memberName, scoreWord } from "@/lib/dc42";

/* "Vua farm gà" — ghi nhiều nhất ở các buổi giao lưu nội bộ trong năm.

   Bảng vàng của riêng sân nhà, tách hẳn khỏi vua phá lưới của giải đấu: ở đây tính
   từ sessionOverrides, nên một người đá giải ít mà tuần nào cũng ra sân vẫn lên ngôi.

   Chưa buổi nào nhập kết quả từ mốc `statsFrom` thì vẫn hiện, ở dạng mở hàng — cùng
   kiểu với khối Giữ chuỗi bên cạnh. */

const PODIUM = 5;

export default function FarmKing({ data, sport, year, from = null }) {
  if (!data) return null;

  const word = scoreWord(sport);

  if (data.rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dc-gold/40 bg-dc-gold-soft px-5 py-4">
        <p className="flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-gold">
          <span className="material-symbols-outlined text-[17px]">crown</span>
          Vua farm gà {year}
        </p>
        <p className="mt-1 text-[13px] text-dc-ink-2">
          Tính từ {from ? fmtDayMonth(from) : "mùa này"}, ai ghi nhiều {word} nhất ở các buổi giao lưu nội bộ sẽ lên
          ngôi. Chưa buổi nào nhập kết quả — ngôi vương còn trống.
        </p>
      </div>
    );
  }

  const [king, ...rest] = data.rows.slice(0, PODIUM);

  return (
    <div className="overflow-hidden rounded-2xl border border-dc-gold/40 bg-dc-gold-soft">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-4">
        <div>
          <p className="flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-gold">
            <span className="material-symbols-outlined text-[17px]">crown</span>
            Vua farm gà {year}
          </p>
          <p className="mt-0.5 text-[13px] text-dc-ink-2">Ghi nhiều {word} nhất ở các buổi giao lưu nội bộ.</p>
        </div>
        <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2 tabular-nums">
          {data.sessions} buổi · {data.goals} {word}
        </p>
      </div>

      {/* Ngôi vương: tên to, số bàn to — phần còn lại chỉ là danh sách bám đuổi. */}
      <div className="mt-3 flex items-center justify-between gap-4 bg-dc-gold px-5 py-3 text-white">
        <span className="min-w-0">
          <span className="block truncate font-dc-display text-[22px] font-bold leading-tight">
            {memberName(king.id)}
          </span>
          <span className="text-[12px] text-white/75 tabular-nums">
            {king.sessions} buổi có {word}
          </span>
        </span>
        <span className="shrink-0 text-right font-dc-display text-[30px] font-bold leading-none tabular-nums">
          {king.goals}
          <span className="ml-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white/75">{word}</span>
        </span>
      </div>

      {rest.length > 0 && (
        <ul className="flex flex-col px-5 pb-4">
          {rest.map((r, i) => (
            <li
              key={r.id}
              className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-dc-gold/20 py-2 text-[13.5px] last:border-b-0"
            >
              <span className="font-dc-display text-[11px] font-bold tabular-nums text-dc-ink-2">{i + 2}</span>
              <span className="min-w-0 truncate text-dc-ink">
                {memberName(r.id)}
                <span className="ml-2 text-[11.5px] tabular-nums text-dc-ink-2">{r.sessions} buổi</span>
              </span>
              <span className="text-right font-dc-display font-bold tabular-nums text-dc-ink">{r.goals}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
