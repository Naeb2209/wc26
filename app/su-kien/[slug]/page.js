import Link from "next/link";
import { notFound } from "next/navigation";
import { eventBySlug, events, fmtDate, fmtTime, mediaFor, memberName, posts, relativeDay, weekdayOf } from "@/lib/dc42";
import { Card, Chip, EmptyState, MediaTile, Section, StatusChip } from "@/components/hub/ui";
import EventHero from "@/components/hub/EventHero";
import { eventTheme, themeVars } from "@/lib/eventThemes";

// Trang tĩnh nhưng có nhãn thời gian tương đối ("còn 3 ngày") -> làm mới mỗi giờ.
export const revalidate = 3600;

export function generateStaticParams() {
  return events().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const e = eventBySlug(slug);
  return e ? { title: `${e.name} | DC42 Hub`, description: e.summary } : {};
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const e = eventBySlug(slug);
  if (!e) notFound();

  const theme = eventTheme(e);
  const album = mediaFor(e.slug);
  const related = posts().filter((p) => p.activity === e.slug);

  const when = `${weekdayOf(e.date)}, ${fmtDate(e.date)}${fmtTime(e.date) ? ` · ${fmtTime(e.date)}` : ""}`;

  return (
    // Biến --ev-* phủ xuống cả trang để các khối dưới hero cũng dùng đúng màu theme.
    <div style={themeVars(theme)} data-event-theme={theme.key}>
      <EventHero
        theme={theme}
        event={e}
        meta={`${when} · ${e.place}`}
        chips={
          <div className="flex flex-wrap gap-2">
            <StatusChip status={e.status} />
            {e.status === "upcoming" ? <Chip tone="gold">{relativeDay(e.date)}</Chip> : null}
          </div>
        }
      />

      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="flex flex-col gap-5 border-t-2 border-t-[color:var(--ev-accent)] p-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">Thời gian</dt>
                <dd className="mt-1 text-body-md text-dc-ink">
                  {weekdayOf(e.date)}, {fmtDate(e.date)}
                  {fmtTime(e.date) ? ` · ${fmtTime(e.date)}` : ""}
                  {e.endDate && String(e.endDate).slice(0, 10) !== String(e.date).slice(0, 10) ? (
                    <span className="block text-[13px] text-dc-ink-2">đến {fmtDate(e.endDate)}</span>
                  ) : null}
                  {e.dateNote ? <span className="block text-[13px] text-dc-ink-2">{e.dateNote}</span> : null}
                </dd>
              </div>
              <div>
                <dt className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">Địa điểm</dt>
                <dd className="mt-1 text-body-md text-dc-ink">{e.place}</dd>
              </div>
              <div>
                <dt className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">Loại</dt>
                <dd className="mt-1 text-body-md text-dc-ink">{e.type}</dd>
              </div>
            </dl>

            {e.recap ? (
              <div className="border-t border-dc-line pt-5">
                <h2 className="font-dc-display text-[11px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Nhìn lại</h2>
                <p className="mt-2 max-w-[64ch] text-body-lg text-dc-ink">{e.recap}</p>
              </div>
            ) : null}

            {e.lineup?.length ? (
              <div className="border-t border-dc-line pt-5">
                <h2 className="font-dc-display text-[11px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">
                  Bộ môn · {e.lineup.length} môn
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {e.lineup.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
                      style={{ borderColor: "var(--ev-line)", background: "var(--ev-soft)" }}
                    >
                      <span className="material-symbols-outlined mt-0.5 text-[18px] text-[color:var(--ev-accent-deep)]">
                        {s.icon || "sports_score"}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-dc-display text-[15px] font-bold leading-tight text-dc-ink">{s.name}</span>
                        {s.note ? <span className="block text-[12.5px] text-dc-ink-2">{s.note}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {e.program?.length ? (
              <div className="border-t border-dc-line pt-5">
                <h2 className="font-dc-display text-[11px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Chương trình</h2>
                <ol className="mt-3 flex flex-col">
                  {e.program.map((p, i) => (
                    <li key={i} className="flex gap-4 border-b border-dc-line py-2.5 last:border-0">
                      <span className="w-16 shrink-0 font-dc-display text-[14px] font-bold tabular-nums text-[color:var(--ev-accent-deep)]">
                        {p.time}
                      </span>
                      <span className="text-body-md text-dc-ink">{p.what}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </Card>

          <div className="flex flex-col gap-4">
            {e.status === "upcoming" && e.rsvp && (
              <Card
                className="flex flex-col gap-3 p-6"
                style={{ borderColor: "var(--ev-line)", background: "var(--ev-soft)" }}
              >
                <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--ev-accent-deep)]">
                  Đăng ký
                </p>
                <p className="text-body-md text-dc-ink">
                  {e.registerNote ||
                    "Sự kiện này cần chốt số người trước. Đăng ký ở kênh của ban tổ chức, hoặc nhắn trực tiếp người phụ trách."}
                </p>
                {e.deadline ? (
                  <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-[color:var(--ev-accent-deep)]">
                    <span className="material-symbols-outlined text-[16px]">event_busy</span>
                    Hạn chót: hết ngày {fmtDate(e.deadline)} · {relativeDay(e.deadline)}
                  </p>
                ) : null}
                <Link
                  href="/bang-tin"
                  className="inline-flex w-fit items-center gap-1.5 rounded-full bg-dc-ink px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">campaign</span>
                  Xem thông báo
                </Link>
              </Card>
            )}

            {related.length > 0 && (
              <Card className="flex flex-col gap-3 p-6">
                <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Bài liên quan</p>
                {related.map((p) => (
                  <Link key={p.slug} href={`/bang-tin/${p.slug}`} className="group">
                    <p className="font-dc-display text-[15px] font-bold leading-snug text-dc-ink group-hover:text-[color:var(--ev-accent)]">
                      {p.title}
                    </p>
                    <p className="text-[12.5px] text-dc-ink-2">
                      {p.kind} · {fmtDate(p.date)} · {memberName(p.author)}
                    </p>
                  </Link>
                ))}
              </Card>
            )}

            <Card className="flex flex-col gap-2 p-6">
              <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Album</p>
              <p className="font-dc-display text-[30px] font-bold leading-none tabular-nums text-dc-ink">{album.length}</p>
              <p className="text-[13px] text-dc-ink-2">
                {album.filter((m) => m.type === "image").length} ảnh · {album.filter((m) => m.type === "video").length} video
              </p>
            </Card>
          </div>
        </div>
      </Section>

      <div className="border-t border-dc-line" style={{ background: "var(--ev-soft)" }}>
        <Section title="Album">
          {album.length === 0 ? (
            <EmptyState
              icon="add_a_photo"
              title="Chưa có ảnh cho sự kiện này"
              hint="Sau sự kiện, ảnh anh em góp sẽ hiện ở đây và trong tab Moments."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {album.map((m) => (
                <MediaTile key={m.id} item={m} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
