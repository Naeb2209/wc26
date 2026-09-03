import Link from "next/link";
import { notFound } from "next/navigation";
import { eventBySlug, fmtDate, memberName, postBySlug, posts, relativeDay, sportSlug, tournamentBySlug } from "@/lib/dc42";
import { Card, Chip, PageHeader, Section } from "@/components/hub/ui";

// Trang tĩnh nhưng có nhãn thời gian tương đối ("còn 3 ngày") -> làm mới mỗi giờ.
export const revalidate = 3600;

export function generateStaticParams() {
  return posts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = postBySlug(slug);
  return p ? { title: `${p.title} | DC42 Hub`, description: p.excerpt } : {};
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const p = postBySlug(slug);
  if (!p) notFound();

  const ev = p.activity ? eventBySlug(p.activity) : null;
  const tour = p.activity ? tournamentBySlug(p.activity) : null;
  const others = posts()
    .filter((x) => x.slug !== p.slug)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Link href="/bang-tin" className="hover:text-dc-ink">
              Bảng tin
            </Link>{" "}
            · {p.kind}
          </>
        }
        title={p.title}
        lede={p.excerpt}
        aside={
          <div className="text-right">
            <p className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
              {memberName(p.author)}
            </p>
            <p className="text-[13px] tabular-nums text-dc-ink-2">
              {fmtDate(p.date)} · {relativeDay(p.date)}
            </p>
          </div>
        }
      />

      <Section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <article className="max-w-[68ch] text-body-lg leading-relaxed text-dc-ink">{p.body}</article>

          <aside className="flex flex-col gap-4">
            {(ev || tour) && (
              <Card
                href={ev ? `/su-kien/${ev.slug}` : `/the-thao/${sportSlug(tour.sport)}/giai-dau/${tour.slug}`}
                className="flex flex-col gap-2 border-dc-gold/40 bg-dc-gold-soft p-5"
              >
                <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">
                  Bài này thuộc về
                </p>
                <p className="font-dc-display text-[17px] font-bold leading-snug text-dc-ink">{ev?.name || tour?.name}</p>
                <p className="text-[13px] text-dc-ink-2">{ev ? ev.type : `${tour.host} · mùa ${tour.season}`}</p>
              </Card>
            )}

            <Card className="flex flex-col gap-3 p-5">
              <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">Bài khác</p>
              {others.map((o) => (
                <Link key={o.slug} href={`/bang-tin/${o.slug}`} className="group">
                  <Chip tone={o.pinned ? "gold" : "neutral"}>{o.kind}</Chip>
                  <p className="mt-1.5 font-dc-display text-[15px] font-bold leading-snug text-dc-ink group-hover:text-dc-gold">
                    {o.title}
                  </p>
                  <p className="text-[12.5px] text-dc-ink-2">{fmtDate(o.date)}</p>
                </Link>
              ))}
            </Card>
          </aside>
        </div>
      </Section>
    </>
  );
}
