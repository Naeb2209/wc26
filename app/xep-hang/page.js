import Link from "next/link";
import {
  allTimeScorers,
  attendanceRanking,
  defaultSeasonOf,
  predictionLeagues,
  honourWinnerLabel,
  honoursByYear,
  memberById,
  sportSlug,
  todayVn,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, PageHeader, Section, SportChip, Stat, StatusChip } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Xếp hạng | DC42 Hub",
  description: "Chuyên cần, vua phá lưới cộng dồn và phòng danh hiệu của DC qua các năm.",
};

export default function RankingPage() {
  const year = String(todayVn().getUTCFullYear());
  const attendance = attendanceRanking(year);
  const scorers = allTimeScorers();
  const honours = honoursByYear();
  const leagues = predictionLeagues();

  const totalSessions = attendance.reduce((s, r) => s + r.total, 0);
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
          <Stat label={`Lượt tham gia ${year}`} value={totalSessions} sub={`${attendance.length} người có mặt ít nhất một buổi`} />
          <Stat label="Chuyên cần nhất" value={topAttender ? topAttender.total : "—"} sub={topAttender?.name} />
          <Stat label="Ghi bàn nhiều nhất" value={topScorer ? topScorer.goals : "—"} sub={topScorer?.name} />
        </div>
      </Section>

      <div className="border-y border-dc-line bg-dc-paper">
        <Section title={`Chuyên cần ${year}`} hint="Đếm số buổi giao lưu đã tham gia trong năm.">
          {attendance.length === 0 ? (
            <EmptyState icon="how_to_reg" title="Chưa ghi nhận buổi nào trong năm" />
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
                  {list.map((h, i) => (
                    <Card key={i} className="flex flex-col gap-2 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <SportChip sport={h.sport} />
                        <span className="material-symbols-outlined text-[22px] text-dc-gold">
                          {h.title.startsWith("Vô địch") ? "emoji_events" : "military_tech"}
                        </span>
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title="Dự đoán & Fantasy"
        hint="Phần chơi cùng các giải lớn. Chi tiết nằm trong Thể thao › Bóng đá › Dự đoán & Fantasy."
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {leagues.map((l) => {
            const cur = defaultSeasonOf(l);
            return (
              <Card key={l.slug} href={`/the-thao/${sportSlug(l.sport)}/du-doan`} className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Chip tone={l.kind === "Fantasy" ? "fantasy" : "neutral"} icon={l.kind === "Fantasy" ? "stadium" : "casino"}>
                    {l.kind}
                  </Chip>
                  <StatusChip status={cur?.status} />
                </div>
                <p className="font-dc-display text-[17px] font-bold leading-snug text-dc-ink">{l.name}</p>
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
