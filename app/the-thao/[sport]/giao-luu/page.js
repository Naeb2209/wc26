import { notFound } from "next/navigation";
import {
  attendanceStreaks,
  getHub,
  pastSessionsOf,
  sessionResult,
  sessionScorers,
  sessionYears,
  sportBySlug,
  sports,
  statsFrom,
  toIsoDate,
  todayVn,
  upcomingSessionsOf,
  venueById,
} from "@/lib/dc42";
import { getRsvp, rosterOf } from "@/lib/dc42-rsvp";
import { kvConfigured } from "@/lib/kv";
import { PageHeader, Section } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SessionList from "@/components/hub/SessionList";
import FarmKing from "@/components/hub/FarmKing";
import StreakBoard from "@/components/hub/StreakBoard";

export const dynamic = "force-dynamic";

// Số tuần đã đá còn giữ lại trên trang.
const PAST_WEEKS = 4;

// Môn đã bật hai bảng nội bộ (Vua farm gà + Giữ chuỗi). Hai bảng chỉ đúng khi sổ điểm
// danh, kết quả buổi và các buổi huỷ đều được ghi đều tay; môn chưa theo kịp thì để
// ngoài còn hơn bày ra con số sai. Mốc bắt đầu tính nằm ở `statsFrom` của môn trong data.
const INTERNAL_BOARDS = ["football"];

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
  // Chỉ giữ buổi đã qua có gì để kể: có kết quả, hoặc đã khai huỷ. Buổi sinh ra từ mẫu
  // lặp mà chưa ai nhập gì thì bày lên cũng chỉ là thẻ rỗng, còn tuần huỷ mà giấu đi
  // thì cả tuần đó biến mất khỏi trang như chưa từng có.
  const played = pastSessionsOf(sp.id, PAST_WEEKS).filter((s) => s.cancelled || (s.matches || []).length > 0);
  const sessions = await Promise.all([
    ...upcomingSessionsOf(sp.id, 1).map((s) => withRoster(s, false)),
    ...played.map((s) => withRoster(s, true)),
  ]);

  // Chỉ đưa thành viên có chơi môn này vào danh sách chọn tên.
  const members = (hub.members || []).filter((m) => (m.sports || []).includes(sp.id));

  const boards = INTERNAL_BOARDS.includes(sp.id);
  const from = statsFrom(sp.id);

  // Vua farm gà tính trên cả năm, không bó trong cửa sổ vài tuần của danh sách bên dưới.
  // Chưa có năm nào có kết quả thì lấy năm của mốc để khối mở hàng còn ghi đúng mùa.
  const year = sessionYears(sp.id)[0] || (from || toIsoDate(todayVn())).slice(0, 4);
  const farm = boards ? sessionScorers(sp.id, year) : null;

  // Chuỗi đi đều tính trên cả sổ điểm danh, không bó theo năm: đứt hay chưa là chuyện của buổi gần nhất.
  const streaks = boards ? attendanceStreaks(sp.id) : null;

  const templates = (hub.sessionTemplates || [])
    .filter((t) => t.sport === sp.id)
    .map((t) => ({ ...t, venue: venueById(t.venueId)?.name || "" }));

  return (
    <>
      <SportNav sport={sp} active="sessions" />

      <PageHeader
        eyebrow={`${sp.name} · Giao lưu`}
        title="Kèo hằng tuần"
        lede={`${templates.length} buổi ${sp.name.toLowerCase()} cố định mỗi tuần. Bấm điểm danh để ban tổ chức chốt sân — hết chỗ thì nút tự khoá.${
          played.length ? ` Dưới buổi sắp tới là ${played.length} buổi gần nhất.` : ""
        }`}
      />

      <Section>
        <SessionList
          sessions={sessions}
          members={members}
          templates={templates}
          shared={kvConfigured()}
          sportSlug={sp.slug}
          farmKing={farm ? <FarmKing data={farm} sport={sp.id} year={year} from={from} /> : null}
          streaks={streaks ? <StreakBoard data={streaks} /> : null}
        />
      </Section>
    </>
  );
}
