import { notFound } from "next/navigation";
import { getHub, sportBySlug, sports, upcomingSessionsOf, venueById } from "@/lib/dc42";
import { getRsvp, rosterOf } from "@/lib/dc42-rsvp";
import { kvConfigured } from "@/lib/kv";
import { PageHeader, Section } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SessionList from "@/components/hub/SessionList";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return sports().map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  return sp ? { title: `Giao lưu ${sp.name.toLowerCase()} | DC42 Hub` } : {};
}

export default async function SportSessionsPage({ params }) {
  const { sport } = await params;
  const sp = sportBySlug(sport);
  if (!sp) notFound();

  const hub = getHub();
  const sessions = await Promise.all(
    upcomingSessionsOf(sp.id, 3).map(async (s) => {
      const overrides = await getRsvp(s.id);
      return { ...s, ...rosterOf(s, overrides) };
    })
  );

  // Chỉ đưa thành viên có chơi môn này vào danh sách chọn tên.
  const members = (hub.members || []).filter((m) => (m.sports || []).includes(sp.id));

  const templates = (hub.sessionTemplates || [])
    .filter((t) => t.sport === sp.id)
    .map((t) => ({ ...t, venue: venueById(t.venueId)?.name || "" }));

  return (
    <>
      <SportNav sport={sp} active="sessions" />

      <PageHeader
        eyebrow={`${sp.name} · Giao lưu`}
        title="Kèo hằng tuần"
        lede={`${templates.length} buổi ${sp.name.toLowerCase()} cố định mỗi tuần. Bấm điểm danh để ban tổ chức chốt sân — hết chỗ thì nút tự khoá.`}
      />

      <Section>
        <SessionList sessions={sessions} members={members} templates={templates} shared={kvConfigured()} />
      </Section>
    </>
  );
}
