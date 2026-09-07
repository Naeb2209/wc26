"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, StatusChip } from "./ui";

/* Thẻ một giải Fantasy, gom nhiều mùa vào một chỗ.
   Nhiều mùa -> hàng pill chọn mùa (26/27, 25/26, 24/25…); một mùa -> chỉ hiện nhãn mùa.
   Mini game dự đoán không phải giải riêng: mỗi mùa tự khai `predictions[]` (đội vô địch, vua phá lưới…)
   và hiện ngay dưới phần mùa đang chọn. */

export default function LeagueCard({ league, defaultSeasonId, tone = "fantasy", icon = "stadium" }) {
  const seasons = league.seasons || [];
  const [seasonId, setSeasonId] = useState(defaultSeasonId || seasons[0]?.id);
  const season = seasons.find((s) => s.id === seasonId) || seasons[0] || {};
  const many = seasons.length > 1;
  // Chỉ được một `mt-auto` trong cột flex: hai auto margin thì CSS chia đôi khoảng trống,
  // khối mini game sẽ không sát footer nữa. Có mini game -> nó giữ mt-auto, không thì footer giữ.
  const hasBets = (season.predictions || []).length > 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-dc-line bg-white">
      <div className="flex items-center gap-3 border-b border-dc-line px-6 pb-4 pt-5">
        <LeagueMark league={league} tone={tone} icon={icon} />
        <div className="min-w-0 flex-1">
          <Chip tone={tone} icon={icon}>
            {league.kind}
          </Chip>
          <p className="mt-1.5 font-dc-display text-[21px] font-bold leading-tight text-dc-ink">{league.name}</p>
        </div>
        <span className="shrink-0 self-start font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
          {seasons.length} mùa
        </span>
      </div>

      {/* Chọn mùa — min-h cố định để thẻ một mùa (chỉ chữ) cao bằng thẻ nhiều mùa (hàng pill),
          nhờ vậy mọi phần bên dưới của các thẻ cạnh nhau vẫn thẳng hàng. */}
      <div className="flex min-h-[56px] flex-wrap items-center gap-2 border-b border-dc-line bg-dc-paper px-6 py-3">
        <span className="mr-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Mùa</span>
        {many ? (
          seasons.map((s) => {
            const on = s.id === season.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeasonId(s.id)}
                aria-pressed={on}
                title={s.season}
                className={`rounded-full border px-3 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums transition-colors ${
                  on
                    ? "border-dc-ink bg-dc-ink text-white"
                    : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
                }`}
              >
                {s.label}
                {s.status === "running" ? <span className="ml-1.5 text-dc-gold">●</span> : null}
              </button>
            );
          })
        ) : (
          <span className="font-dc-display text-[12px] font-bold uppercase tracking-[0.08em] text-dc-ink tabular-nums">
            {season.season}
          </span>
        )}
      </div>

      {/* Mùa đang chọn */}
      <div className="flex flex-1 flex-col gap-3 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={season.status} />
          {season.champion ? <Chip tone="gold" icon="emoji_events">{season.champion}</Chip> : null}
        </div>

        <p className="text-body-md text-dc-ink-2">{season.note || league.note}</p>

        <PredictionList list={season.predictions} />

        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-t border-dc-line pt-3 ${
            hasBets ? "" : "mt-auto"
          }`}
        >
          <span className="text-[13px] text-dc-ink-2 tabular-nums">
            {season.players ? `${season.players} người chơi` : "Chưa chốt danh sách"}
          </span>
          {/* Cả hai nút đều có viền 1px (nút mực dùng border-transparent) để cao bằng nhau,
              nhờ vậy đáy hai thẻ cạnh nhau nằm đúng một đường. */}
          {season.href ? (
            <Link
              href={season.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-dc-ink px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white"
            >
              Mở bảng điểm
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dc-line px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              Chưa có bảng điểm
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* Logo giải. Hai biến thể theo hình dạng file:
   - `logoWide: true` cho logo nằm ngang (lockup lân + chữ của Premier League) -> ô rộng, cao 48px;
   - mặc định là ô vuông 48px cho logo hình khối (cúp World Cup).
   `logoBg: "dark"` cho logo vẽ bằng mực trắng — ô nền mực để nét trắng không mất hút trên thẻ trắng.
   Chưa khai `logo`, hoặc file không tải được, thì rơi về ô icon theo tông màu của giải. */
function LeagueMark({ league, tone, icon }) {
  const [broken, setBroken] = useState(false);

  if (league.logo && !broken) {
    const skin = league.logoBg === "dark" ? "border-dc-ink bg-dc-ink" : "border-dc-line bg-white";
    const shape = league.logoWide
      ? "h-10 w-auto max-w-[92px] px-1.5 sm:h-12 sm:max-w-[124px] sm:px-2"
      : "size-12";
    return (
      <span className={`grid shrink-0 place-items-center rounded-xl border p-1.5 ${skin} ${shape}`}>
        <img
          src={league.logo}
          alt=""
          aria-hidden="true"
          onError={() => setBroken(true)}
          className="max-h-full w-auto max-w-full object-contain"
        />
      </span>
    );
  }

  const tint = tone === "fantasy" ? "bg-dc-fantasy/10 text-dc-fantasy" : "bg-dc-bone text-dc-ink-2";
  return (
    <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tint}`}>
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </span>
  );
}

/* Mini game dự đoán kèm theo mùa. Chưa có đáp án -> nói rõ đang mở/chờ kết quả thay vì để trống.
   `ul` là grid 3 cột và mỗi `li` dùng `display: contents` để câu hỏi / đáp án / chip người thắng
   thẳng cột giữa các dòng, thay vì mỗi dòng tự co theo độ dài câu hỏi. */
function PredictionList({ list }) {
  const bets = list || [];
  if (bets.length === 0) return null;

  return (
    // mt-auto: ghi chú của mỗi mùa dài ngắn khác nhau, nên ghim khối này xuống sát đáy để nó
    // thẳng hàng giữa các thẻ cạnh nhau thay vì trôi theo số dòng của ghi chú.
    <div className="mt-auto rounded-xl border border-dc-line bg-dc-paper p-3">
      <p className="mb-2 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">
        Mini game dự đoán
      </p>
      <ul className="grid grid-cols-[16px_auto_minmax(6.5rem,1fr)] items-start gap-x-2 gap-y-2 text-[13px]">
        {bets.map((b) => (
          <li key={b.id} className="contents">
            <span className="material-symbols-outlined mt-px text-[16px] leading-none text-dc-ink-2">
              {b.icon || "casino"}
            </span>
            <span className="font-semibold text-dc-ink">{b.question}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-dc-ink-2">
                — {b.answer || (b.status === "open" ? "đang mở" : "chờ kết quả")}
              </span>
              {b.winners?.length ? (
                <Chip tone="gold" icon="emoji_events" className="ml-auto shrink-0">
                  {b.winners.join(", ")}
                </Chip>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
