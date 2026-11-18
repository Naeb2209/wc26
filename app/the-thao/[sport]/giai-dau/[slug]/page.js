import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fmtDate,
  fmtTime,
  focusTeamsOf,
  leagueById,
  mediaFor,
  memberName,
  rosterOf,
  scorersOf,
  splitMatches,
  standingsOf,
  teamName,
  siblingSeasonsOf,
  sportBySlug,
  sports,
  tournamentBySlug,
  tournamentsOf,
  venueById,
  weekdayOf,
} from "@/lib/dc42";
import { Card, Chip, EmptyState, PageHeader, Section, SportChip, Stat, StatusChip } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SeasonPicker from "@/components/hub/SeasonPicker";
import PhotoSlider from "@/components/hub/PhotoSlider";
import SeasonAlbum from "@/components/hub/SeasonAlbum";
import MatchTimeline from "@/components/hub/MatchTimeline";

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

  // Giải của đơn vị ngoài chỉ liệt kê trận của đội DC — BXH bên trên vẫn tính đủ các đội.
  // DG7 League Cup mỗi mùa DC góp hai đội nên đây là một mảng.
  const focus = focusTeamsOf(t);
  const { played: allPlayed, upcoming: allUpcoming } = splitMatches(t);
  const mine = (m) => focus.length === 0 || focus.includes(m.home) || focus.includes(m.away);
  const played = allPlayed.filter(mine);
  const upcoming = allUpcoming.filter(mine);
  // Một danh sách duy nhất: trận chưa đá lên đầu, rồi tới trận đã đá mới nhất trước.
  const timeline = [...upcoming, ...played];
  // Dựng sẵn chữ ở đây để khối danh sách (client, có bộ lọc đội) không phải kéo cả dc42.json xuống máy.
  const timelineRows = timeline.map((m) => {
    const done = m.status === "done";
    const football = t.sport === "football";
    return {
      id: m.id,
      done,
      teams: [m.home, m.away],
      lead: done ? m.round || weekdayOf(m.date) : weekdayOf(m.date),
      when: fmtDate(m.date) + (done ? "" : ` · ${fmtTime(m.date)}`),
      home: football ? teamName(m.home) : m.home || "?",
      away: football ? teamName(m.away) : m.away || "?",
      score: done ? (football ? `${m.hs} – ${m.as}` : m.score) : "vs",
      goals: (m.goals || []).map((g) => ({ id: g.m, name: memberName(g.m), n: g.n || 1 })),
    };
  });
  // Mùa có hai đội của DC thì cho lọc theo từng đội.
  const focusChips = focus.map((id) => ({ id, name: teamName(id) }));
  const table = standingsOf(t);
  const scorers = scorersOf(t).slice(0, 6);
  // Đội hình mùa này: chỉ những giải có khai roster mới hiện. Số áo lấy theo mùa.
  const roster = rosterOf(t);
  const album = mediaFor(t.slug);
  const photos = album.filter((m) => m.type === "image" && m.url);
  const venue = venueById(t.venueId);
  const isFootball = t.sport === "football";
  // Giải nhiều mùa (vd TMA Futsal League): tiêu đề mang tên giải, mùa do bộ chọn mùa nói.
  const seasons = siblingSeasonsOf(t);
  const league = seasons.length > 1 ? leagueById(t.league) : null;
  // Album gom cả giải: mỗi mùa có ảnh là một pill, mùa đang xem mở sẵn.
  const seasonAlbums = (seasons.length > 1 ? seasons : [t])
    .map((s) => ({ slug: s.slug, season: s.season, items: mediaFor(s.slug) }))
    .filter((a) => a.items.length > 0);

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
        title={league?.name || t.name}
        lede={t.summary}
        aside={
          <div className="flex flex-wrap gap-2">
            <SportChip sport={t.sport} />
            <Chip tone={t.host === "TMA" ? "neutral" : "gold"}>{t.host}</Chip>
            {league && t.division ? <Chip tone="neutral">{t.division}</Chip> : null}
            <StatusChip status={t.status} />
          </div>
        }
      />

      {/* Hàng chọn mùa nằm ngay trên băng ảnh: đổi mùa là đổi cả ảnh lẫn số liệu bên dưới.
          Giới thiệu giải đã nằm ở lede của trang nên không lặp lại ở đây nữa. */}
      {league || photos.length > 0 ? (
        <Section>
          {league ? (
            <SeasonPicker seasons={seasons} current={t.slug} sportSlug={sp.slug} size="sm" className="mb-3" />
          ) : null}

          {photos.length > 0 ? (
            // Để tràn hết bề ngang nội dung cho hai tấm kề có chỗ ló ra; cỡ ảnh giữa do
            // chiều cao băng chuyền quyết định.
            <div className="w-full">
              <PhotoSlider items={photos} />
              <div className="mt-2 flex justify-end">
                <Link
                  href="#album"
                  className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold"
                >
                  {photos.length} ảnh mùa này →
                </Link>
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Thể thức" value={isFootball ? `${t.teams?.length || 0} đội` : (t.entries?.length || 0) + " cặp"} sub={t.format} />
          <Stat label="Đã đá" value={`${allPlayed.length}`} sub={`Còn ${allUpcoming.length} trận`} />
          {/* Mùa cũ chỉ biết năm thì ô này nói mùa, không để ngày trống. */}
          {t.startDate ? (
            <Stat label="Thời gian" value={fmtDate(t.startDate).slice(0, 5)} sub={`đến ${fmtDate(t.endDate)}`} />
          ) : (
            <Stat label="Thời gian" value={t.season} sub="Không lưu ngày từng vòng" />
          )}
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
                      const isMine = focus.includes(r.teamId);
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
                  {r.number || "–"}
                </span>
                <span className="min-w-0 flex-1 truncate font-dc-display text-[15px] font-bold text-dc-ink">
                  {r.member?.name || r.id}
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
        title={focus.length ? `Lịch & kết quả của ${focus.map(teamName).join(" và ")}` : "Lịch & kết quả"}
        hint={focus.length ? "Chỉ liệt kê trận có đội của DC; bảng xếp hạng bên trên vẫn tính đủ các đội." : undefined}
      >
        <MatchTimeline items={timelineRows} teams={focusChips} />
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

      <Section
        id="album"
        title={league ? "Album các mùa" : "Album của giải"}
        hint={league ? "Ảnh của mọi mùa gom về đây — đổi mùa ngay tại chỗ." : undefined}
      >
        {seasonAlbums.length === 0 ? (
          <EmptyState icon="photo_library" title="Chưa có ảnh cho giải này" hint="Ảnh anh em góp sẽ tự hiện ở đây và trong tab Moments." />
        ) : (
          <SeasonAlbum albums={seasonAlbums} current={t.slug} />
        )}
      </Section>
    </>
  );
}
