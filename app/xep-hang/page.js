import Link from "next/link";
import {
  allTimeScorers,
  attendanceRanking,
  defaultSeasonOf,
  fmtDayMonth,
  predictionLeagues,
  honourWinnerLabel,
  honoursByYear,
  memberById,
  sports,
  sportSlug,
  statsFrom,
  todayVn,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, LeagueLogo, PageHeader, Section, SportChip, Stat, StatusChip } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Xếp hạng | DC42 Hub",
  description: "Chuyên cần, vua phá lưới cộng dồn và phòng danh hiệu của DC qua các năm.",
};

/* Màu theo hạng huy chương (`rank` trong honours[]). Tô nguyên khung viền và icon, nền
   vẫn trắng — tô cả nền thì mười thẻ cạnh nhau thành sặc sỡ, lạc khỏi tông mực/vàng/kem
   của hub. Giải phụ như phong cách hay khuyến khích không có hạng nên giữ viền mặc định,
   đúng với việc nó không phải huy chương. */
const MEDAL = {
  gold: { ring: "ring-2 ring-dc-gold/70", icon: "text-dc-gold", symbol: "emoji_events" },
  silver: { ring: "ring-2 ring-dc-silver/70", icon: "text-dc-silver", symbol: "military_tech" },
  bronze: { ring: "ring-2 ring-dc-bronze/70", icon: "text-dc-bronze", symbol: "military_tech" },
  none: { ring: "ring-0", icon: "text-dc-ink-2", symbol: "workspace_premium" },
};

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

  return (
    <>
      <PageHeader
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

      <div className="border-y border-dc-line bg-dc-paper">
        <Section
          title={`Chuyên cần ${year}`}
          hint={`Đếm số buổi giao lưu đã tham gia trong năm.${resetNote}`}
        >
          {attendance.length === 0 ? (
            <EmptyState
              icon="how_to_reg"
              title="Chưa ghi nhận buổi nào"
              hint={
                resets.length > 0
                  ? `Bảng tính lại từ ${fmtDayMonth(resets[0].from)}; buổi đầu tiên được ghi sổ sẽ hiện ở đây.`
                  : "Buổi đầu tiên được ghi sổ sẽ hiện ở đây."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-dc-line bg-white">
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
                  {attendance.map((r, i) => (
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
          )}
        </Section>
      </div>

      <Section title="Vua phá lưới cộng dồn" hint="Tính trên các giải có dữ liệu bàn thắng từng trận.">
        {scorers.length === 0 ? (
          <EmptyState icon="sports_soccer" title="Chưa có dữ liệu bàn thắng" />
        ) : (
          <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {scorers.map((s, i) => (
              <li key={s.memberId} className="flex items-center gap-3 rounded-2xl border border-dc-line bg-white px-5 py-3.5">
                <span className="w-5 font-dc-display text-[13px] font-bold tabular-nums text-dc-ink-2">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-dc-display text-[15px] font-bold text-dc-ink">{s.name}</span>
                <span className="hidden text-[12.5px] text-dc-ink-2 sm:block">{s.team}</span>
                <span className="font-dc-display text-[18px] font-bold tabular-nums text-dc-gold">{s.goals}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <div className="border-y border-dc-line bg-dc-paper">
        <Section title="Phòng danh hiệu">
          <div className="flex flex-col gap-8">
            {honours.map(([year, list]) => (
              <div key={year}>
                <h3 className="mb-3 font-dc-display text-[13px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">{year}</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((h, i) => {
                    const medal = MEDAL[h.rank] || MEDAL.none;
                    return (
                      <Card key={i} className={`relative flex flex-col gap-2 overflow-hidden p-5 ${medal.ring}`}>
                        {/* Hạng đọc được bằng khung viền màu; giải phụ không có hạng nên
                            giữ viền xám mặc định của thẻ. */}
                        <div className="flex items-center justify-between gap-2">
                          <SportChip sport={h.sport} />
                          <span className={`material-symbols-outlined text-[22px] ${medal.icon}`}>{medal.symbol}</span>
                        </div>
                        <p className="font-dc-display text-[16px] font-bold leading-snug text-dc-ink">{h.title}</p>
                        <p className="text-body-md text-dc-ink-2">
                          {honourWinnerLabel(h)}
                          {h.detail ? ` — ${h.detail}` : ""}
                        </p>
                        {h.tournament ? (
                          <Link
                            href={`/the-thao/${sportSlug(h.sport)}/giai-dau/${h.tournament}`}
                            className="mt-1 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-gold"
                          >
                            Xem giải →
                          </Link>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
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
