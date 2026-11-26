import { memberName, scoreWord } from "@/lib/dc42";

/* Kết quả một buổi giao lưu: buổi chia 2–3 đội đá vòng tròn với nhau.

   variant "card": chỉ bảng đội + hiệu số, vừa một thẻ trong lưới hai cột.
   variant "page": thêm người ghi của từng bên mỗi trận và đội hình từng đội.
   Đội hình đã kèm số bàn mỗi người nên không có danh sách ghi bàn thứ hai lặp lại. */

const DOT = {
  red: "bg-dc-kit-red",
  blue: "bg-dc-kit-blue",
  yellow: "bg-dc-kit-yellow",
  green: "bg-dc-pitch",
  light: "bg-white ring-1 ring-inset ring-dc-line",
  dark: "bg-dc-ink",
};

const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
const label = "font-dc-display text-[9.5px] font-bold uppercase tracking-[0.16em] text-dc-ink-2";

function Dot({ color, className = "h-2.5 w-2.5" }) {
  return <span aria-hidden="true" className={`${className} shrink-0 rounded-full ${DOT[color] || "bg-dc-ink-2"}`} />;
}

/* Một bên của dòng tỉ số hai đội. Bên phải lật ngược để chấm màu nằm sát mép ngoài. */
function Side({ team, lead, mirrored = false }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-2 rounded px-2 py-1.5 ${mirrored ? "flex-row-reverse" : ""} ${
        lead ? "bg-dc-gold text-white" : "bg-white text-dc-ink"
      }`}
    >
      <Dot color={team.color} />
      <span className="truncate font-dc-display text-[13px] font-bold">{team.name}</span>
    </span>
  );
}

/* Số bàn của một người. Bóng đá: mỗi bàn một quả bóng (giống danh sách trận của giải);
   môn khác tính điểm nên vẫn để số. Bóng đá chỉ 1 bàn mà `one` = false thì không vẽ gì. */
function Tally({ n, ball, one = true, className = "" }) {
  if (!n || (n === 1 && !one && !ball)) return null;
  if (!ball) return <span className={`font-dc-display font-bold tabular-nums text-dc-gold ${className}`}>{n}</span>;
  return (
    <span className={`inline-flex items-center text-dc-gold ${className}`} title={`${n} bàn`}>
      {Array.from({ length: n }).map((_, k) => (
        <span key={k} aria-hidden="true" className="material-symbols-outlined text-[13px] leading-none">
          sports_soccer
        </span>
      ))}
      <span className="sr-only">{n} bàn</span>
    </span>
  );
}

export default function SessionResult({ result, sport, nameOf, variant = "page" }) {
  if (!result) return null;

  const { table, matches, scorers } = result;
  const full = variant === "page";
  // Hai đội thì bảng xếp hạng chỉ là hai dòng nói lại đúng một tỉ số -> thay bằng
  // chính tỉ số cộng dồn giữa hai bên. Ba đội mới cần bảng và cột hiệu số.
  const head2head = table.length === 2;
  const word = scoreWord(sport);
  const teamName = Object.fromEntries(table.map((t) => [t.id, t.name]));
  const colorOf = (id) => table.find((t) => t.id === id)?.color;
  // Trang buổi chạy ở server nên không có sẵn map tên; tra thẳng từ dữ liệu hub.
  const nameOrId = (id) => nameOf?.[id] || memberName(id);
  const ball = sport === "football";
  // Người ghi của một bên trong một trận. Môn tính điểm giữ kiểu cũ: chỉ ghi số khi > 1.
  const listOf = (goals, align = "") => (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${align}`}>
      {goals.map((g, i) => (
        <span key={`${g.id}${g.og ? "-og" : ""}`} className="inline-flex items-center gap-1">
          {nameOrId(g.id)}
          <Tally n={g.goals} ball={ball} one={false} />
          {g.og ? <span className="font-dc-display text-[10px] font-bold uppercase tracking-[0.08em] text-dc-ink-2">OG</span> : null}
          {i < goals.length - 1 ? <span className="-ml-1 text-dc-ink-2/60">,</span> : null}
        </span>
      ))}
    </span>
  );

  return (
    // Trong lưới thẻ: khối kết quả giãn hết chiều cao thẻ để buổi 2 đội và buổi 3 đội
    // cạnh nhau có hai khối bằng nhau; phần tỉ số tự căn giữa chỗ trống dôi ra.
    <div className={`flex flex-col gap-3 rounded-xl bg-dc-paper ${full ? "p-5" : "grow p-3"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={label}>Kết quả buổi · {table.length} đội</p>
        <p className={`${label} tabular-nums`}>{matches.length} trận</p>
      </div>

      {/* Hai đội: một dòng tỉ số, bên dẫn tô gold. Hoà thì cả hai để trắng. */}
      {head2head ? (
        <div
          className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 ${full ? "" : "my-auto"}`}
        >
          <Side team={table[0]} lead={table[0].pts > table[1].pts} />
          <span className="font-dc-display text-[17px] font-bold tabular-nums text-dc-ink">
            {table[0].gf}–{table[1].gf}
          </span>
          <Side team={table[1]} lead={table[1].pts > table[0].pts} mirrored />
        </div>
      ) : (
      /* Ba đội: bảng tên ↔ tỉ số cộng dồn ↔ hiệu số. Cột hiệu số là thứ cần liếc nhanh nhất. */
      <ul className="flex flex-col gap-1">
        {table.map((t, i) => (
          <li
            key={t.id}
            className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded px-2 py-1.5 ${
              i === 0 ? "bg-dc-gold text-white" : "bg-white text-dc-ink"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Dot color={t.color} />
              <span className="truncate font-dc-display text-[13px] font-bold">{t.name}</span>
              <span className={`shrink-0 text-[11px] tabular-nums ${i === 0 ? "text-white/70" : "text-dc-ink-2"}`}>
                {t.won}T {t.drawn}H {t.lost}B
              </span>
            </span>
            <span className="text-right text-[12.5px] tabular-nums">
              {t.gf}–{t.ga}
            </span>
            <span className="w-9 text-right font-dc-display text-[12.5px] font-bold tabular-nums">{sign(t.gd)}</span>
          </li>
        ))}
      </ul>
      )}

      {/* Thẻ trong lưới chỉ điểm mặt vài người ghi nhiều nhất; chi tiết nằm ở trang buổi. */}
      {!full && scorers.length > 0 && (
        <p className="text-[12.5px] text-dc-ink-2">
          <span className={`${label} mr-1.5`}>Ghi {word}</span>
          {scorers.slice(0, 3).map((s, i) => (
            <span key={s.id}>
              {i > 0 ? " · " : ""}
              {nameOrId(s.id)} <Tally n={s.goals} ball={ball} className="align-[-2px]" />
            </span>
          ))}
          {scorers.length > 3 ? <span className="text-dc-ink-2/70"> · +{scorers.length - 3} người</span> : null}
        </p>
      )}

      {full && (
        <>
          {/* Từng trận theo đúng thứ tự đá, mỗi bên kèm người ghi của mình. */}
          <ul className="flex flex-col gap-2 border-t border-dc-line pt-3">
            {matches.map((m, i) => (
              <li
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-x-3 text-[13px]"
              >
                <span className="truncate text-right font-dc-display font-bold text-dc-ink">
                  {teamName[m.a] || m.a}
                </span>
                <span className="font-dc-display font-bold tabular-nums text-dc-ink">
                  {m.unknown ? "?–?" : `${m.as}–${m.bs}`}
                </span>
                <span className="truncate font-dc-display font-bold text-dc-ink">{teamName[m.b] || m.b}</span>

                {m.goalsA.length > 0 || m.goalsB.length > 0 ? (
                  <>
                    <span className="text-right text-[11.5px] leading-snug text-dc-ink-2">
                      {listOf(m.goalsA, "justify-end")}
                    </span>
                    <span aria-hidden="true" />
                    <span className="text-[11.5px] leading-snug text-dc-ink-2">{listOf(m.goalsB)}</span>
                  </>
                ) : null}

                {m.others.length > 0 && (
                  <span className="col-span-3 text-center text-[11.5px] text-dc-ink-2">
                    {listOf(m.others, "justify-center")}
                  </span>
                )}
                {/* Ghi chú trận (phản lưới nhà…) — không có thì trận không người ghi để lại dòng trống. */}
                {m.note || m.unknown ? (
                  <span className="col-span-3 text-center text-[11.5px] italic text-dc-ink-2">
                    {m.note || "Không rõ kết quả — không tính vào bảng xếp"}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Đội hình từng đội, người ghi nhiều lên trước; ai chưa ghi thì tên xám không có số. */}
          <div className="flex flex-col gap-3 border-t border-dc-line pt-3">
            {table.map((t) => (
              <div key={t.id}>
                <p className={`${label} flex items-center gap-2 pb-1.5`}>
                  <Dot color={t.color} className="h-2 w-2" />
                  {t.name}
                  <span className="tabular-nums text-dc-ink-2/70">
                    {t.lineup.length} người · {t.gf} {word}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.lineup.map((pl) => (
                    <span
                      key={pl.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[12.5px] ${
                        pl.goals ? "text-dc-ink" : "text-dc-ink-2"
                      }`}
                    >
                      {nameOrId(pl.id)}
                      <Tally n={pl.goals} ball={ball} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
