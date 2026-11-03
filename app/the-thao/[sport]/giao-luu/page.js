import { notFound } from "next/navigation";
import { getHub, pastSessionsOf, sessionResult, sportBySlug, sports, upcomingSessionsOf, venueById } from "@/lib/dc42";
import { getRsvp, rosterOf } from "@/lib/dc42-rsvp";
import { kvConfigured } from "@/lib/kv";
import { PageHeader, Section } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SessionList from "@/components/hub/SessionList";

export const dynamic = "force-dynamic";

// Số tuần đã đá còn giữ lại trên trang.
const PAST_WEEKS = 4;

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
  // Buổi của tuần đang tới (mỗi mẫu đúng một lần) rồi tới các tuần đã đá, mới nhất lên trước.
  const withRoster = async (s, past) => {
    const overrides = await getRsvp(s.id);
    // Chia đội + kết quả tính sẵn ở server, client chỉ việc vẽ.
    return { ...s, ...rosterOf(s, overrides), past, result: sessionResult(s) };
  };
  const sessions = await Promise.all([
    ...upcomingSessionsOf(sp.id, 1).map((s) => withRoster(s, false)),
    ...pastSessionsOf(sp.id, PAST_WEEKS).map((s) => withRoster(s, true)),
  ]);

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
        lede={`${templates.length} buổi ${sp.name.toLowerCase()} cố định mỗi tuần. Bấm điểm danh để ban tổ chức chốt sân — hết chỗ thì nút tự khoá. Dưới buổi sắp tới là ${PAST_WEEKS} tuần đã đá.`}
      />

      <Section>
        <SessionList
          sessions={sessions}
          members={members}
          templates={templates}
          shared={kvConfigured()}
          sportSlug={sp.slug}
        />
      </Section>
    </>
  );
}
