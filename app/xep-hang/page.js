import Link from "next/link";
import {
  allTimeScorers,
  attendanceRanking,
  defaultSeasonOf,
  fmtDayMonth,
  heroImage,
  predictionLeagues,
  honourWinnerLabel,
  honoursByYear,
  memberById,
  sports,
  sportSlug,
  statsFrom,
  todayVn,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, LeagueLogo, PageHeader, Section, Stat, StatusChip, sportMeta } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Xếp hạng | DC42 Hub",
  description: "Chuyên cần, vua phá lưới cộng dồn và phòng danh hiệu của DC qua các năm.",
};

/* Dựng theo trang Legacy của EWC:
   - Thẻ "nhà vô địch" chia đôi: nửa mực có huy hiệu viền vàng, tên và con số vàng toả cực to;
     nửa kia là ảnh không khí.
   - Hàng ô "Hạng #n" cho những người xếp sau, nút vàng "Xem toàn bộ bảng" mở bảng đầy đủ.
   - Phòng danh hiệu là lưới thẻ "Champions": nhãn hạng chuyển sắc, hai nửa Môn / Người thắng,
     nút xám tràn ngang dẫn về giải. */

/* Hạng huy chương (`rank` trong honours[]) -> nhãn + nền chuyển sắc của nhãn. Giải phụ như
   phong cách hay khuyến khích không có hạng nên dùng nhãn mực, đúng với việc nó không phải huy chương. */
const MEDAL = {
  gold: { label: "Huy chương vàng", badge: "bg-radial-gold", icon: "emoji_events" },
  silver: { label: "Huy chương bạc", badge: "bg-radial-silver", icon: "military_tech" },
  bronze: { label: "Huy chương đồng", badge: "bg-radial-bronze", icon: "military_tech" },
  none: { label: "Giải thưởng", badge: "bg-dc-ink", icon: "workspace_premium" },
};

const initial = (name) => (name || "?").trim().split(/\s+/).pop()?.[0]?.toUpperCase() || "?";

export default function RankingPage() {
  const year = String(todayVn().getUTCFullYear());
  const attendance = attendanceRanking(year);
  const scorers = allTimeScorers();
  const honours = honoursByYear();
  const leagues = predictionLeagues();

  const totalSessions = attendance.reduce((s, r) => s + r.total, 0);

  // Môn đã tính lại từ một mốc: nói ra ngay dưới tiêu đề, không thì con số tụt mà
  // không ai hiểu vì sao.
  const resets = sports()
    .map((s) => ({ name: s.name, from: statsFrom(s.id) }))
    .filter((s) => s.from);
  // Mọi môn cùng một mốc thì nói một lần, không liệt kê từng môn cho dài dòng.
  const sameFrom = resets.length > 0 && resets.every((r) => r.from === resets[0].from);
  const resetNote =
    resets.length === 0
      ? ""
      : sameFrom
        ? ` Tính lại từ ${fmtDayMonth(resets[0].from)}.`
        : resets.map((r) => ` ${r.name} tính lại từ ${fmtDayMonth(r.from)}.`).join("");

  const topAttender = attendance[0];
  const topScorer = scorers[0];
  const chasers = attendance.slice(1, 7);
  const sportPhoto = heroImage((a) => a.sport, 2);

  return (
    <>
      <PageHeader
        hero
        image={heroImage((a) => a.kind === "Giải đấu", 9)}
        eyebrow="Xếp hạng"
        title="Ai chăm, ai ghi bàn, ai vô địch"
        lede="Bảng cắt ngang mọi giải và mọi buổi giao lưu — không giới hạn trong một mùa."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Chưa có buổi nào vào sổ thì để gạch ngang: số 0 to đùng trông như thống kê
              đã chốt, trong khi thực tế là chưa đếm được gì. */}
          <Stat
            label={`Lượt tham gia ${year}`}
            value={totalSessions || "—"}
            sub={
              attendance.length > 0
                ? `${attendance.length} người có mặt ít nhất một buổi`
                : "Chưa buổi nào vào sổ"
            }
          />
          <Stat label="Chuyên cần nhất" value={topAttender ? topAttender.total : "—"} sub={topAttender?.name} />
          <Stat label="Ghi bàn nhiều nhất" value={topScorer ? topScorer.goals : "—"} sub={topScorer?.name} />
        </div>
      </Section>

      <div className="bg-[#f5f5f5]">
        <section className="mx-auto w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop md:py-16">
          <CenteredTitle title={`Vua chuyên cần ${year}`} hint={`Người có mặt nhiều buổi giao lưu nhất trong năm.${resetNote}`} />

          {attendance.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon="how_to_reg"
                title="Chưa ghi nhận buổi nào"
                hint={
                  resets.length > 0
                    ? `Bảng tính lại từ ${fmtDayMonth(resets[0].from)}; buổi đầu tiên được ghi sổ sẽ hiện ở đây.`
                    : "Buổi đầu tiên được ghi sổ sẽ hiện ở đây."
                }
              />
            </div>
          ) : (
            <>
              <ChampionCard row={topAttender} year={year} photo={sportPhoto} />

              {chasers.length > 0 ? (
                <ol className="hide-scrollbar -mx-margin-mobile mt-6 flex gap-3 overflow-x-auto px-margin-mobile pb-2 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
                  {chasers.map((r, i) => (
                    <PositionTile key={r.memberId} row={r} place={i + 2} />
                  ))}
                </ol>
              ) : null}

              {/* <details>: bảng đầy đủ mở tại chỗ, khỏi cần JS phía client. */}
              <details className="group mt-8">
                <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-xl bg-radial-gold px-6 py-3 font-dc-display text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[4px_8px_16px_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90 [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Xem toàn bộ bảng</span>
                  <span className="hidden group-open:inline">Thu gọn bảng</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <AttendanceTable rows={attendance} />
              </details>
            </>
          )}
        </section>
      </div>

      <Section title="Vua phá lưới cộng dồn" hint="Tính trên các giải có dữ liệu bàn thắng từng trận.">
        {scorers.length === 0 ? (
          <EmptyState icon="sports_soccer" title="Chưa có dữ liệu bàn thắng" />
        ) : (
          <ol className="grid items-start gap-2 md:grid-cols-2 lg:grid-cols-3">
            {scorers.map((s, i) => (
              <li key={s.memberId} className="rounded-2xl border border-dc-line bg-white">
                {/* Bấm vào dòng để xổ ra số bàn từng mùa — <details> nên khỏi cần JS phía client. */}
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="w-5 font-dc-display text-[13px] font-bold tabular-nums text-dc-ink-2">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-dc-display text-[15px] font-bold text-dc-ink">{s.name}</span>
                    <span className="hidden text-[12.5px] text-dc-ink-2 sm:block">{s.team}</span>
                    <span className="font-dc-display text-[18px] font-bold tabular-nums text-dc-gold">{s.goals}</span>
                    <span className="material-symbols-outlined text-[18px] text-dc-ink-2 transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <ul className="flex flex-col gap-1.5 border-t border-dc-line px-5 py-3">
                    {s.seasons.map((t) => (
                      <li key={t.slug} className="flex items-center gap-3 text-[13px]">
                        <Link
                          href={`/the-thao/${sportSlug(t.sport)}/giai-dau/${t.slug}`}
                          className="min-w-0 flex-1 truncate text-dc-ink-2 hover:text-dc-ink"
                        >
                          {t.name}
                        </Link>
                        <span className="font-dc-display font-bold tabular-nums text-dc-ink">{t.goals}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <div className="bg-[#f5f5f5]">
        <section className="mx-auto w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop md:py-16">
          <CenteredTitle title="Phòng danh hiệu" hint="Mọi huy chương và giải thưởng DC mang về, xếp theo năm." />
          <div className="mt-10 flex flex-col gap-12">
            {honours.map(([y, list]) => (
              <div key={y}>
                <h3 className="mb-5 flex items-center gap-3 font-dc-display text-[22px] font-bold text-dc-ink md:text-[28px]">
                  Nhà vô địch {y}
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
                    {list.length} danh hiệu
                  </span>
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((h, i) => (
                    <HonourCard key={i} h={h} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Section
        title="Fantasy"
        hint="Phần chơi cùng các giải lớn. Chi tiết nằm trong Thể thao › Bóng đá › Fantasy."
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {leagues.map((l) => {
            const cur = defaultSeasonOf(l);
            return (
              <Card key={l.slug} href={`/the-thao/${sportSlug(l.sport)}/fantasy`} className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Chip tone="fantasy" icon="stadium">
                    {l.kind}
                  </Chip>
                  <StatusChip status={cur?.status} />
                </div>
                <div className="flex items-center gap-2.5">
                  <LeagueLogo league={l} />
                  <p className="font-dc-display text-[17px] font-bold leading-snug text-dc-ink">{l.name}</p>
                </div>
                <p className="text-[13.5px] text-dc-ink-2 tabular-nums">
                  {(l.seasons || []).length} mùa · đang xem {cur?.season}
                </p>
                {cur?.champion ? (
                  <p className="text-[12.5px] text-dc-ink-2">Vô địch mùa này: {cur.champion}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/* Tiêu đề canh giữa + một dòng phụ, như "2026 Club Championship Winner" của EWC. */
function CenteredTitle({ title, hint }) {
  return (
    <div className="text-center">
      <h2 className="font-dc-display text-[28px] font-bold leading-[1.05] text-dc-ink md:text-[40px]">{title}</h2>
      {hint ? <p className="mx-auto mt-2 max-w-[60ch] text-[15px] text-dc-ink-2 md:text-[17px]">{hint}</p> : null}
    </div>
  );
}

function ChampionCard({ row, year, photo }) {
  const member = memberById(row.memberId);
  const split = [
    { id: "football", n: row.football },
    { id: "badminton", n: row.badminton },
  ].filter((s) => s.n > 0);

  return (
    <div className="mt-8 grid grid-cols-1 overflow-hidden rounded-[24px] md:rounded-[32px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-between gap-10 bg-dc-ink p-6 sm:p-10 xl:p-16">
        <div>
          <span className="inline-flex rounded-full border border-dc-gold/70 px-4 py-1.5 font-dc-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#d1b26e]">
            Chuyên cần {year}
          </span>

          <div className="mt-8 flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-radial-gold font-dc-display text-[26px] font-bold text-white ring-4 ring-white/10 md:size-20 md:text-[32px]">
              {initial(row.name)}
            </span>
            <div className="min-w-0">
              <p className="font-dc-display text-[28px] font-bold uppercase leading-none text-white md:text-[40px]">{row.name}</p>
              {member?.role || member?.team ? (
                <p className="mt-2 text-[14px] text-white/60">{[member?.role, member?.team].filter(Boolean).join(" · ")}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <p className="font-dc-display text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">Số buổi đã có mặt</p>
          <p className="text-radial-gold mt-1 font-dc-display text-[72px] font-bold leading-[0.9] tabular-nums md:text-[96px] xl:text-[120px]">
            {row.total}
          </p>
          {split.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {split.map((s) => {
                const meta = sportMeta(s.id);
                return (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-dc-display text-[12px] font-bold uppercase tracking-[0.1em] text-white/85"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#d1b26e]">{meta.icon}</span>
                    {s.n} × {meta.name}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative bg-dc-ink max-lg:aspect-[16/10] lg:min-h-[240px]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,#151515_0%,rgba(21,21,21,0)_40%),linear-gradient(0deg,rgba(21,21,21,0.55)_0%,rgba(21,21,21,0)_50%)] max-lg:bg-[linear-gradient(180deg,#151515_0%,rgba(21,21,21,0)_35%)]"
        />
        <span
          aria-hidden="true"
          className="material-symbols-outlined absolute bottom-6 right-6 text-[64px] text-[#d1b26e]/90 drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
        >
          workspace_premium
        </span>
      </div>
    </div>
  );
}

/* Ô "Position #n" của EWC: viền vàng 2px, nhãn hạng chuyển sắc, số liệu bên dưới. */
function PositionTile({ row, place }) {
  return (
    <li className="flex w-[158px] shrink-0 flex-col items-center gap-2.5 rounded-xl border-2 border-dc-gold bg-white px-2 py-3.5 text-center md:w-[175px]">
      <span className="bg-radial-gold rounded-[4px] px-[6px] py-[3px] font-dc-display text-[10px] font-bold uppercase leading-[1.3] tracking-[0.12em] text-white">
        Hạng #{place}
      </span>
      <span className="grid size-11 place-items-center rounded-full bg-dc-bone font-dc-display text-[17px] font-bold text-dc-ink">
        {initial(row.name)}
      </span>
      <span className="w-full truncate px-1 font-dc-display text-[14px] font-bold text-dc-ink">{row.name}</span>
      <span className="font-dc-display text-[12px] font-bold uppercase tracking-[0.08em] text-dc-ink-2">{row.total} buổi</span>
    </li>
  );
}

function AttendanceTable({ rows }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[520px] text-[14px]">
        <thead>
          <tr className="border-b border-dc-line text-left font-dc-display text-[10px] uppercase tracking-[0.14em] text-dc-ink-2">
            <th className="px-4 py-3 font-bold">#</th>
            <th className="px-4 py-3 font-bold">Thành viên</th>
            <th className="px-3 py-3 text-center font-bold">Bóng đá</th>
            <th className="px-3 py-3 text-center font-bold">Cầu lông</th>
            <th className="px-4 py-3 text-center font-bold">Tổng buổi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.memberId} className="border-b border-dc-line last:border-0">
              <td className="px-4 py-3 tabular-nums text-dc-ink-2">{i + 1}</td>
              <td className="px-4 py-3">
                <span className={`font-dc-display font-bold ${i < 3 ? "text-dc-gold" : "text-dc-ink"}`}>{r.name}</span>
                {memberById(r.memberId)?.role ? (
                  <span className="ml-2 text-[12px] text-dc-ink-2">{memberById(r.memberId).role}</span>
                ) : null}
              </td>
              <td className="px-3 py-3 text-center tabular-nums text-dc-ink-2">{r.football || "–"}</td>
              <td className="px-3 py-3 text-center tabular-nums text-dc-ink-2">{r.badminton || "–"}</td>
              <td className="px-4 py-3 text-center font-dc-display text-[16px] font-bold tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Thẻ "Champions" của EWC: nhãn trên cùng, hai nửa (môn | người thắng), nút xám tràn ngang. */
function HonourCard({ h }) {
  const medal = MEDAL[h.rank] || MEDAL.none;
  const meta = sportMeta(h.sport);
  const winner = honourWinnerLabel(h);
  const group = Array.isArray(h.winners) && h.winners.length > 1;

  return (
    <article className="flex flex-col gap-4 rounded-[24px] bg-white p-4 shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col items-center gap-2 px-2 pt-1 text-center">
        <span
          className={`inline-flex items-center gap-1 rounded-[4px] px-[7px] py-[3px] font-dc-display text-[10px] font-bold uppercase leading-[1.3] tracking-[0.12em] text-white ${medal.badge}`}
        >
          <span className="material-symbols-outlined text-[13px] leading-none">{medal.icon}</span>
          {medal.label}
        </span>
        <p className="font-dc-display text-[16px] font-bold leading-snug text-dc-ink">{h.title}</p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-dc-line rounded-2xl bg-[#f7f7f7] py-4">
        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
          <span className={`grid size-12 place-items-center rounded-xl ${meta.bg}`}>
            <span className={`material-symbols-outlined text-[26px] ${meta.text}`}>{meta.icon}</span>
          </span>
          <span className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">Môn</span>
          <span className="font-dc-display text-[13px] font-bold text-dc-ink">{meta.name || "—"}</span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1.5 px-2 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-dc-ink font-dc-display text-[18px] font-bold text-white">
            {group ? <span className="material-symbols-outlined text-[24px]">groups</span> : initial(winner)}
          </span>
          <span className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
            {h.kind === "team" ? "Đội" : group ? "Đồng đội" : "Người thắng"}
          </span>
          <span className="line-clamp-2 font-dc-display text-[13px] font-bold leading-snug text-dc-ink">{winner}</span>
        </div>
      </div>

      {h.detail ? <p className="-mt-1 px-2 text-center text-[13px] text-dc-ink-2">{h.detail}</p> : null}

      {h.tournament ? (
        <Link
          href={`/the-thao/${sportSlug(h.sport)}/giai-dau/${h.tournament}`}
          className="mt-auto block rounded-xl bg-[#f0f0f0] py-3 text-center font-dc-display text-[11.5px] font-bold uppercase tracking-[0.12em] text-dc-ink transition-colors hover:bg-dc-ink hover:text-white"
        >
          Xem giải
        </Link>
      ) : null}
    </article>
  );
}
