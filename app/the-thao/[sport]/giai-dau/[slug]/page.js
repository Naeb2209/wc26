import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fmtDate,
  fmtTime,
  mediaFor,
  memberById,
  memberName,
  scorersOf,
  splitMatches,
  standingsOf,
  teamName,
  sportBySlug,
  sports,
  tournamentBySlug,
  tournamentsOf,
  venueById,
  weekdayOf,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, MediaTile, PageHeader, Section, SportChip, Stat, StatusChip } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";

// Trang tĩnh nhưng có nhãn thời gian tương đối ("còn 3 ngày") -> làm mới mỗi giờ.
export const revalidate = 3600;

export function generateStaticParams() {
  return sports().flatMap((sp) => tournamentsOf(sp.id).map((t) => ({ sport: sp.slug, slug: t.slug })));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const t = tournamentBySlug(slug);
  return t ? { title: `${t.name} | DC42 Hub`, description: t.summary } : {};
}

export default async function TournamentPage({ params }) {
  const { sport, slug } = await params;
  const sp = sportBySlug(sport);
  const t = tournamentBySlug(slug);
  // Chặn đường dẫn lệch môn, ví dụ /the-thao/cau-long/giai-dau/tma-futsal-league-2026.
  if (!sp || !t || t.sport !== sp.id) notFound();

  // focusTeam: giải của đơn vị ngoài (TMA) chỉ liệt kê trận của đội DC — BXH bên trên vẫn tính đủ các đội.
  const { played: allPlayed, upcoming: allUpcoming } = splitMatches(t);
  const mine = (m) => !t.focusTeam || m.home === t.focusTeam || m.away === t.focusTeam;
  const played = allPlayed.filter(mine);
  const upcoming = allUpcoming.filter(mine);
  // Một danh sách duy nhất: trận chưa đá lên đầu, rồi tới trận đã đá mới nhất trước.
  const timeline = [...upcoming, ...played];
  const table = standingsOf(t);
  const allScorers = scorersOf(t);
  const scorers = allScorers.slice(0, 6);
  // Đội hình mùa này: chỉ những giải có khai roster (danh sách member id) mới hiện.
  const goalsBy = new Map(allScorers.map((s) => [s.memberId, s.goals]));
  const roster = (t.roster || [])
    .map((id) => ({ id, m: memberById(id), goals: goalsBy.get(id) || 0 }))
    .sort((a, b) => b.goals - a.goals || Number(a.m?.number || 999) - Number(b.m?.number || 999));
  const album = mediaFor(t.slug);
  const venue = venueById(t.venueId);
  const isFootball = t.sport === "football";

  return (
    <>
      <SportNav sport={sp} active="tournaments" />

      <PageHeader
        eyebrow={
          <>
            <Link href={`/the-thao/${sp.slug}/giai-dau`} className="hover:text-dc-ink">
              Giải {sp.name.toLowerCase()}
            </Link>{" "}
            · Mùa {t.season}
          </>
        }
        title={t.name}
        lede={t.summary}
        aside={
          <div className="flex flex-wrap gap-2">
            <SportChip sport={t.sport} />
            <Chip tone={t.host === "TMA" ? "neutral" : "gold"}>{t.host}</Chip>
            <StatusChip status={t.status} />
          </div>
        }
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Thể thức" value={isFootball ? `${t.teams?.length || 0} đội` : (t.entries?.length || 0) + " cặp"} sub={t.format} />
          <Stat label="Đã đá" value={`${allPlayed.length}`} sub={`Còn ${allUpcoming.length} trận`} />
          <Stat label="Thời gian" value={fmtDate(t.startDate).slice(0, 5)} sub={`đến ${fmtDate(t.endDate)}`} />
          <Stat label="Địa điểm" value={venue?.name?.replace(/^Sân |^NTĐ |^CLB /, "") || "—"} sub={venue?.address} />
        </div>
      </Section>

      {/* BXH (bóng đá) hoặc danh sách cặp (cầu lông) */}
      <div className="border-y border-dc-line bg-dc-paper">
        <Section title={isFootball ? "Bảng xếp hạng" : "Đại diện của DC"}>
          {isFootball ? (
            table.length === 0 ? (
              <EmptyState icon="table_rows" title="Mùa này chưa nhập dữ liệu từng trận" hint="Kết quả tổng kết nằm ở phần danh hiệu bên dưới." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-dc-line bg-white">
                <table className="w-full min-w-[560px] text-[14px]">
                  <thead>
                    <tr className="border-b border-dc-line text-left font-dc-display text-[10px] uppercase tracking-[0.14em] text-dc-ink-2">
                      <th className="px-4 py-3 font-bold">#</th>
                      <th className="px-4 py-3 font-bold">Đội</th>
                      <th className="px-3 py-3 text-center font-bold">Trận</th>
                      <th className="px-3 py-3 text-center font-bold">T</th>
                      <th className="px-3 py-3 text-center font-bold">H</th>
                      <th className="px-3 py-3 text-center font-bold">B</th>
                      <th className="px-3 py-3 text-center font-bold">BT/BB</th>
                      <th className="px-4 py-3 text-center font-bold">Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((r, i) => {
                      // Hàng của đội DC được tô nền vàng nhạt cho dễ tìm trong bảng.
                      const isMine = r.teamId === t.focusTeam;
                      return (
                      <tr
                        key={r.teamId}
                        className={`border-b border-dc-line last:border-0 ${isMine ? "bg-dc-gold-soft/60" : ""}`}
                      >
                        <td className={`px-4 py-3 tabular-nums ${isMine ? "font-bold text-dc-gold" : "text-dc-ink-2"}`}>{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className={`font-dc-display font-bold ${isMine ? "text-dc-gold" : "text-dc-ink"}`}>{r.name}</span>
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">{r.p}</td>
                        <td className="px-3 py-3 text-center tabular-nums">{r.w}</td>
                        <td className="px-3 py-3 text-center tabular-nums">{r.d}</td>
                        <td className="px-3 py-3 text-center tabular-nums">{r.l}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-dc-ink-2">
                          {r.gf}/{r.ga}
                        </td>
                        <td className={`px-4 py-3 text-center font-dc-display text-[16px] font-bold tabular-nums ${isMine ? "text-dc-gold" : ""}`}>
                          {r.pts}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="border-t border-dc-line px-4 py-3 text-[12.5px] text-dc-ink-2">
                  {t.standingNote || `Hai đội dẫn đầu vào chung kết ngày ${fmtDate(t.endDate)}.`}
                </p>
              </div>
            )
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(t.entries || []).map((e) => (
                <Card key={e.id} className="flex flex-col gap-1 p-5">
                  <Chip tone="badminton">{e.bracket}</Chip>
                  <p className="mt-2 font-dc-display text-[18px] font-bold text-dc-ink">{e.label}</p>
                  <p className="text-[13px] text-dc-ink-2">{e.pair.map((id) => memberName(id)).join(" · ")}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      {roster.length > 0 && (
        <Section title="Đội hình mùa này" hint={`${roster.length} cầu thủ đã đăng ký · ${roster.filter((r) => r.goals > 0).length} người đã ghi bàn`}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-dc-line bg-white px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dc-bone font-dc-display text-[13px] font-bold tabular-nums text-dc-ink-2">
                  {r.m?.number || "–"}
                </span>
                <span className="min-w-0 flex-1 truncate font-dc-display text-[15px] font-bold text-dc-ink">
                  {r.m?.name || r.id}
                </span>
                {r.goals > 0 ? (
                  <span className="shrink-0 font-dc-display text-[13px] font-bold tabular-nums text-dc-gold">
                    {r.goals} bàn
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={t.focusTeam ? `Lịch & kết quả của ${teamName(t.focusTeam)}` : "Lịch & kết quả"}
        hint={t.focusTeam ? "Chỉ liệt kê trận có đội của DC; bảng xếp hạng bên trên vẫn tính đủ các đội." : undefined}
      >
        {timeline.length === 0 ? (
          <EmptyState icon="history" title="Mùa này không lưu chi tiết từng trận" />
        ) : (
          <ul className="flex flex-col gap-2">
            {timeline.map((m) => {
              const done = m.status === "done";
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-dc-line bg-white px-5 py-4">
                  <div className="w-[86px] shrink-0">
                    <p className={`font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] ${done ? "text-dc-ink-2" : "text-dc-gold"}`}>
                      {done ? m.round || weekdayOf(m.date) : weekdayOf(m.date)}
                    </p>
                    <p className="text-[13px] tabular-nums text-dc-ink-2">
                      {fmtDate(m.date)}
                      {done ? "" : ` · ${fmtTime(m.date)}`}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-dc-display text-[15.5px] font-bold text-dc-ink">
                      {isFootball ? (
                        <>
                          {teamName(m.home)}{" "}
                          <span className={done ? "text-dc-gold" : "text-dc-ink-2"}>{done ? `${m.hs} – ${m.as}` : "vs"}</span>{" "}
                          {teamName(m.away)}
                        </>
                      ) : (
                        <>
                          {m.home || "?"} <span className={done ? "text-dc-gold" : "text-dc-ink-2"}>{done ? m.score : "vs"}</span>{" "}
                          {m.away || "?"}
                        </>
                      )}
                    </p>
                    {m.goals?.length ? (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-dc-ink-2">
                        {m.goals.map((g, gi) => (
                          <span key={`${m.id}-${g.m}`} className="inline-flex items-center gap-1">
                            {gi > 0 ? <span className="text-dc-line">·</span> : null}
                            {memberName(g.m)}
                            {/* Mỗi bàn một quả bóng, thay cho ×2 / ×3. */}
                            <span className="inline-flex items-center text-dc-gold" title={`${g.n} bàn`}>
                              {Array.from({ length: g.n || 1 }).map((_, k) => (
                                <span key={k} className="material-symbols-outlined text-[14px] leading-none">
                                  sports_soccer
                                </span>
                              ))}
                            </span>
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                  {!done ? <Chip tone="gold">Chưa đá</Chip> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {!t.roster?.length && (scorers.length > 0 || t.topScorer) && (
        <div className="border-y border-dc-line bg-dc-paper">
          <Section title="Vua phá lưới">
            {scorers.length > 0 ? (
              <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {scorers.map((s, i) => (
                  <li key={s.memberId} className="flex items-center gap-3 rounded-2xl border border-dc-line bg-white px-5 py-3.5">
                    <span className="font-dc-display text-[13px] font-bold tabular-nums text-dc-ink-2">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-dc-display text-[15px] font-bold text-dc-ink">{s.name}</span>
                    <span className="text-[12.5px] text-dc-ink-2">{s.team}</span>
                    <span className="font-dc-display text-[18px] font-bold tabular-nums text-dc-gold">{s.goals}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <Card className="flex items-center gap-3 p-5">
                <span className="material-symbols-outlined text-[26px] text-dc-gold">military_tech</span>
                <p className="text-body-md text-dc-ink">
                  {memberName(t.topScorer.memberId)} — {t.topScorer.goals} bàn cả mùa.
                </p>
              </Card>
            )}
          </Section>
        </div>
      )}

      <Section title="Album của giải" hint={album.length ? `${album.length} ảnh & video` : undefined}>
        {album.length === 0 ? (
          <EmptyState icon="photo_library" title="Chưa có ảnh cho giải này" hint="Ảnh anh em góp sẽ tự hiện ở đây và trong tab Moments." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {album.map((m) => (
              <MediaTile key={m.id} item={m} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
