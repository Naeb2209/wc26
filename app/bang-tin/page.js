import Link from "next/link";
import { fmtDate, memberName, posts, relativeDay } from "@/lib/dc42";
import { Card, Chip, PageHeader, Section } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bảng tin | DC42 Hub",
  description: "Thông báo, recap và điều lệ của DC — thay cho việc mọi thứ trôi trong chat.",
};

const KIND_TONE = { "Thông báo": "gold", Recap: "neutral", "Điều lệ": "neutral" };

export default async function NewsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const kind = sp.loai || "all";
  const all = posts();
  const list = kind === "all" ? all : all.filter((p) => p.kind === kind);
  const kinds = [...new Set(all.map((p) => p.kind))];

  return (
    <>
      <PageHeader
        eyebrow="Bảng tin"
        title="Thông báo & recap"
        lede="Việc gì cần mọi người biết thì nằm ở đây, không trôi mất sau vài trăm tin nhắn."
      />

      <Section>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <KindLink label="Tất cả" value="all" active={kind === "all"} />
          {kinds.map((k) => (
            <KindLink key={k} label={k} value={k} active={kind === k} />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {list.map((p) => (
            <Card key={p.slug} href={`/bang-tin/${p.slug}`} className={`p-6 ${p.pinned ? "border-dc-gold/40 bg-dc-gold-soft" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={KIND_TONE[p.kind] || "neutral"}>{p.kind}</Chip>
                {p.pinned ? <Chip tone="ink" icon="push_pin">Ghim</Chip> : null}
                <span className="text-[12.5px] text-dc-ink-2">
                  {fmtDate(p.date)} · {relativeDay(p.date)} · {memberName(p.author)}
                </span>
              </div>
              <p className="mt-3 font-dc-display text-[21px] font-bold leading-tight text-dc-ink">{p.title}</p>
              <p className="mt-1.5 max-w-[70ch] text-body-md text-dc-ink-2">{p.excerpt}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

function KindLink({ label, value, active }) {
  return (
    <Link
      href={value === "all" ? "/bang-tin" : `/bang-tin?loai=${encodeURIComponent(value)}`}
      className={`rounded-full border px-3.5 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
        active ? "border-dc-ink bg-dc-ink text-white" : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
      }`}
    >
      {label}
    </Link>
  );
}
