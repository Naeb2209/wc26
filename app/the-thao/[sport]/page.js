import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fmtDate,
  fmtTime,
  formatFee,
  defaultSeasonOf,
  groupByLeague,
  predictionLeaguesOf,
  recentResults,
  relativeDay,
  sortedTournamentsOf,
  sportBySlug,
  sports,
  sportSummary,
  upcomingSessionsOf,
  weekdayOf,
} from "@/lib/dc42";
import { getRsvp, rosterOf } from "@/lib/dc42-rsvp";
import { Card, Chip, EmptyState, PageHeader, Section, Stat, StatusChip } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SportHero from "@/components/hub/SportHero";
import TournamentCard from "@/components/hub/TournamentCard";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return sports().map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  return sp ? { title: `${sp.name} | DC42 Hub`, description: sp.blurb } : {};
}

export default async function SportOverviewPage({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  if (!sp) notFound();

  const sum = sportSummary(sp.id);
  // Vẫn lấy cửa sổ 3 tuần để biết buổi nào bị huỷ, nhưng ở hub chỉ hiện đúng buổi kế tiếp —
  // ba buổi giống hệt nhau xếp cạnh nhau chỉ khác mỗi ngày thì thừa; ai cần đủ lịch thì vào tab
  // Giao lưu. Stat "buổi kế tiếp" lấy từ đúng danh sách này nên không lệch với thẻ bên dưới.
  // Kéo cả điểm danh vào đây (giống tab Giao lưu): hero hứa "buổi kế tiếp còn chỗ hay không",
  // thẻ chỉ in sức chứa thì chưa trả lời được câu đó.
  const sessions = await Promise.all(
    upcomingSessionsOf(sp.id, 3).map(async (x) => ({ ...x, ...rosterOf(x, await getRsvp(x.id)) }))
  );
  const nextPlayable = sessions.find((s) => !s.cancelled) || null;
  // Thẻ duy nhất chính là buổi mà stat đang trỏ tới; cả ba tuần đều huỷ thì hiện buổi gần nhất.
  const nextSessions = [nextPlayable || sessions[0]].filter(Boolean);
  const tours = sortedTournamentsOf(sp.id);
  const running = tours.filter((t) => t.status === "running");
  const leagues = predictionLeaguesOf(sp.id);
  const results = recentResults(20).filter((r) => r.sport === sp.id).slice(0, 4);
  // Gom theo giải trước rồi mới cắt: giải nhiều mùa chỉ chiếm một thẻ (có bộ chọn mùa),
  // không thì hai mùa liền nhau của cùng một giải ăn hết chỗ và nhìn như thẻ trùng.
  const shownGroups = groupByLeague(running.length > 0 ? running : tours).slice(0, 2);

  return (
    <>
      <SportNav sport={sp} active="overview" />

      <PageHeader eyebrow="Thể thao" title={sp.name} />

      <SportHero sport={sp} />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Buổi mỗi tuần" value={sum.sessionsPerWeek} sub="Giao lưu cố định" />
          <Stat
            label="Giải đang diễn ra"
            value={sum.running}
            sub={`${sum.tournaments} giải đã lưu`}
            href={`/the-thao/${sp.slug}/giai-dau`}
          />
          <Stat
            label="Buổi kế tiếp"
            value={nextPlayable ? relativeDay(nextPlayable.startsAt) : "—"}
            sub={nextPlayable ? `${weekdayOf(nextPlayable.startsAt)} · ${fmtTime(nextPlayable.startsAt)}` : "Ba tuần tới chưa có buổi nào"}
            href={`/the-thao/${sp.slug}/giao-luu`}
          />
          <Stat
            label={sp.hasPrediction ? "Fantasy" : "Kết quả đã lưu"}
            value={sp.hasPrediction ? sum.fantasyLeagues : results.length}
            sub={sp.hasPrediction ? "giải theo mùa" : "trận gần đây"}
            href={sp.hasPrediction ? `/the-thao/${sp.slug}/fantasy` : undefined}
          />
        </div>
      </Section>

      <div className="border-y border-dc-line bg-dc-paper">
        <Section
          title="Giao lưu hằng tuần"
          hint="Kèo lặp lại mỗi tuần, cần điểm danh để chốt sân."
          action={
            <Link
              href={`/the-thao/${sp.slug}/giao-luu`}
              className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
            >
              Điểm danh →
            </Link>
          }
        >
          {nextSessions.length === 0 ? (
            <EmptyState icon="event_busy" title="Ba tuần tới chưa có buổi nào" />
          ) : (
            <div className={`grid gap-3 ${nextSessions.length > 1 ? "md:grid-cols-3" : "max-w-card-max"}`}>
              {nextSessions.map((s) => (
                <Card key={s.id} href={`/the-thao/${sp.slug}/giao-luu#${s.id}`} className="flex flex-col gap-2 p-5">
                  <div className="flex items-center gap-2">
                    <Chip tone={s.cancelled ? "live" : "gold"}>{s.cancelled ? "Đã huỷ" : relativeDay(s.startsAt)}</Chip>
                    {!s.cancelled ? (
                      <Chip tone={s.slotsLeft === 0 ? "live" : "neutral"}>
                        {s.slotsLeft === 0 ? "Hết chỗ" : `Còn ${s.slotsLeft} chỗ`}
                      </Chip>
                    ) : null}
                  </div>
                  <p className="font-dc-display text-[17px] font-bold leading-snug text-dc-ink">{s.title}</p>
                  <p className="text-[13px] text-dc-ink-2">
                    {weekdayOf(s.startsAt)}, {fmtDate(s.startsAt)} · {fmtTime(s.startsAt)}
                  </p>
                  <p className="text-[13px] text-dc-ink-2">
                    {s.venue?.name} · {s.going.length}/{s.capacity} chỗ · {formatFee(s.fee)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Giải đấu trong năm"
        action={
          <Link
            href={`/the-thao/${sp.slug}/giai-dau`}
            className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
          >
            Tất cả {sum.tournaments} giải →
          </Link>
        }
      >
        {tours.length === 0 ? (
          <EmptyState icon="emoji_events" title="Chưa có giải nào cho môn này" />
        ) : (
          // Chỉ chia đôi khi có từ 2 giải trở lên; một giải thì chặn bề ngang lại
          // thay vì để thẻ kéo dài hết khung.
          <div className={`grid gap-4 ${shownGroups.length > 1 ? "md:grid-cols-2" : "max-w-card-max"}`}>
            {shownGroups.map((g) => (
              <TournamentCard
                key={g.current.slug}
                tournament={g.current}
                league={g.league}
                seasons={g.seasons}
                sportSlug={sp.slug}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Môn không có Fantasy thì ô stat thứ tư đếm "kết quả đã lưu" —
          phải có chỗ xem thật, không thì con số đó dẫn tới hư không. */}
      {!sp.hasPrediction && results.length > 0 && (
        <div className="border-t border-dc-line bg-dc-paper">
          <Section title="Kết quả gần nhất" hint="Trận mới nhất của DC ở các giải đã lưu.">
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={`${r.slug}-${r.at}-${r.label}`}>
                  <Link
                    href={`/the-thao/${sp.slug}/giai-dau/${r.slug}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-dc-line bg-white px-5 py-4 transition-colors hover:border-dc-gold"
                  >
                    <span className="w-[86px] shrink-0 text-[13px] tabular-nums text-dc-ink-2">{fmtDate(r.at)}</span>
                    <span className="min-w-0 flex-1 font-dc-display text-[15.5px] font-bold text-dc-ink">{r.label}</span>
                    <span className="text-[12.5px] text-dc-ink-2">
                      {r.round ? `${r.round} · ` : ""}
                      {r.tournament}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {sp.hasPrediction && (
        <div className="border-t border-dc-line bg-dc-paper">
          <Section
            title="Fantasy"
            hint="Phần chơi cùng các giải lớn — không phải giải DC tự tổ chức. Mini game dự đoán nằm trong từng mùa."
            action={
              <Link
                href={`/the-thao/${sp.slug}/fantasy`}
                className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
              >
                Xem tất cả →
              </Link>
            }
          >
            <div className={`grid gap-4 ${leagues.length > 1 ? "md:grid-cols-2" : "max-w-card-max"}`}>
              {leagues.map((l) => {
                const cur = defaultSeasonOf(l);
                const bets = (cur?.predictions || []).length;
                const champs = (l.seasons || []).filter((s) => s.champion);
                return (
                  <Card
                    key={l.slug}
                    href={`/the-thao/${sp.slug}/fantasy?giai=${l.slug}`}
                    // Nằm trong lưới hai cột thì thẻ ăn trọn cột — max-w-card-max chỉ dành cho thẻ đứng
                    // một mình, để đây thì mép phải hụt so với khối "Giải đấu trong năm" ngay trên.
                    className="flex w-full flex-col overflow-hidden"
                  >
                    <div className="flex items-center justify-center gap-2 border-b border-dc-line bg-dc-paper px-5 py-2.5">
                      <Chip tone="fantasy" icon="stadium">
                        {l.kind}
                      </Chip>
                      <StatusChip status={cur?.status} />
                    </div>

                    {/* Khối nhận diện: logo để trần (không khung), nhưng vẫn nằm trong ô cao cố định
                        để hai thẻ cạnh nhau thẳng hàng dù logo dọc/ngang khác tỉ lệ nhau.
                        Logo nét trắng (`logoBg: "dark"`) mới cần nền mực, nếu không sẽ mất hút trên thẻ trắng. */}
                    <div className="flex flex-col items-center gap-3 px-5 pb-5 pt-6 text-center">
                      {l.logo ? (
                        <span
                          className={`grid h-[76px] w-full max-w-[180px] place-items-center ${
                            l.logoBg === "dark" ? "rounded-xl bg-dc-ink px-3" : ""
                          }`}
                        >
                          <img src={l.logo} alt="" aria-hidden="true" className="max-h-[60px] w-auto max-w-full object-contain" />
                        </span>
                      ) : (
                        <span className="grid size-[76px] place-items-center rounded-xl bg-dc-fantasy/10 text-dc-fantasy">
                          <span className="material-symbols-outlined text-[32px]">stadium</span>
                        </span>
                      )}
                      <div>
                        <p className="font-dc-display text-[22px] font-bold leading-tight text-dc-ink md:text-[25px]">
                          {l.name}
                        </p>
                        {l.note ? <p className="mt-1.5 max-w-[42ch] text-[13.5px] leading-snug text-dc-ink-2">{l.note}</p> : null}
                      </div>
                    </div>

                    <dl className="mt-auto border-t border-dc-line px-5 text-[13.5px]">
                      <FantasyRow label="Mùa đang tính" value={cur?.season || "—"} />
                      <FantasyRow label="Người chơi" value={cur?.players ? `${cur.players} người` : "Chưa chốt"} />
                      <FantasyRow label="Mini game dự đoán" value={bets ? `${bets} câu` : "Chưa mở"} />
                      <FantasyRow label="Số mùa đã chơi" value={(l.seasons || []).length} />
                      {champs.length > 0 ? (
                        <FantasyRow label="Vô địch gần nhất" value={champs[0].champion} gold />
                      ) : null}
                    </dl>

                    <div className="px-5 pb-5 pt-4">
                      <span className="block rounded-full bg-dc-ink py-2.5 text-center font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                        Xem giải
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>
        </div>
      )}
    </>
  );
}

/* Một dòng số liệu trong thẻ Fantasy: nhãn trái, giá trị phải, kẻ ngang giữa các dòng
   (kiểu bảng "Prize Pool / Participating clubs" của thẻ giải esports). */
function FantasyRow({ label, value, gold = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dc-line py-2.5 last:border-b-0">
      <dt className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">{label}</dt>
      <dd className={`text-right font-dc-display text-[14px] font-bold tabular-nums ${gold ? "text-dc-gold" : "text-dc-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
