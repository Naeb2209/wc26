import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findSession,
  fmtDate,
  fmtTime,
  formatFee,
  memberName,
  relativeDay,
  scoreWord,
  sessionResult,
  splitsTeams,
  sportBySlug,
  weekdayOf,
} from "@/lib/dc42";
import { getRsvp, rosterOf } from "@/lib/dc42-rsvp";
import { Chip, EmptyState, PageHeader, Section, Stat } from "@/components/hub/ui";
import SportNav from "@/components/hub/SportNav";
import SessionResult from "@/components/hub/SessionResult";
import TeamDraw from "@/components/hub/TeamDraw";

// Buổi sinh ra từ mẫu lặp hằng tuần nên không có danh sách hữu hạn để dựng sẵn.
export const dynamic = "force-dynamic";

/** Id buổi là "<templateId>@<date>" — "@" phải mã hoá khi đưa vào đường dẫn. */
const read = (value) => decodeURIComponent(value || "");

export async function generateMetadata({ params }) {
  const { session } = await params;
  const s = findSession(read(session));
  return s ? { title: `${s.title} · ${fmtDate(s.date)} | DC42 Hub` } : {};
}

export default async function SessionPage({ params }) {
  const { sport, session } = await params;
  const sp = sportBySlug(sport);
  const s = findSession(read(session));
  // Chặn đường dẫn lệch môn, ví dụ buổi cầu lông nằm dưới /the-thao/bong-da.
  if (!sp || !s || s.sport !== sp.id) notFound();

  const { going, out } = rosterOf(s, await getRsvp(s.id));
  const result = sessionResult(s);
  const word = scoreWord(s.sport);
  const past = new Date(`${s.endsAt}+07:00`) < new Date();

  return (
    <>
      <SportNav sport={sp} active="sessions" />

      <PageHeader
        eyebrow={`${sp.name} · Giao lưu`}
        title={s.title}
        lede={`${weekdayOf(s.startsAt)}, ${fmtDate(s.startsAt)} · ${fmtTime(s.startsAt)}–${fmtTime(s.endsAt)} · ${
          s.venue?.name || "chưa chốt sân"
        }`}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {s.cancelled ? <Chip tone="live">Đã huỷ</Chip> : null}
            {past && !s.cancelled ? <Chip>Đã đá</Chip> : null}
            <Chip>{relativeDay(s.startsAt)}</Chip>
          </div>
        }
      />

      <Section>
        <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={s.cancelled ? "Đã chốt" : "Có mặt"} value={`${going.length}/${s.capacity}`} />
          <Stat label="Tiền sân" value={formatFee(s.fee)} />
          <Stat label="Chủ kèo" value={s.host?.short || s.host?.name || "—"} />
          <Stat
            label={result ? `Tổng ${word}` : "Trạng thái"}
            value={result ? String(result.goals) : s.cancelled ? "Đã huỷ" : past ? "Đã đá" : "Chưa đá"}
            sub={result ? `${result.matches.length} trận · ${result.table.length} đội` : null}
          />
        </div>

        {s.cancelled ? (
          <EmptyState icon="event_busy" title="Buổi này đã huỷ" hint={s.cancelReason || undefined} />
        ) : result ? (
          <SessionResult result={result} sport={s.sport} />
        ) : splitsTeams(s) ? (
          <TeamDraw session={s} going={going} variant="page" />
        ) : (
          <EmptyState
            icon="groups"
            title={past ? "Buổi này chưa nhập kết quả" : "Buổi chưa đá"}
            hint={
              past
                ? "Khai teams[] và matches[] trong sessionOverrides của ngày này để hiện bảng đội."
                : "Kết quả hiện ở đây sau khi đá xong."
            }
          />
        )}

        {/* Ai đi / ai báo vắng — phần này đúng cho cả buổi chưa đá lẫn buổi đã đá.
            Buổi huỷ thì danh sách chỉ còn là người đã chốt đi, không ai ra sân cả. */}
        <div className="mt-7 rounded-2xl border border-dc-line bg-white p-5">
          <h2 className="font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">
            Danh sách {s.cancelled ? "đã chốt" : past ? "đã đi" : "đăng ký"} · {going.length}
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {going.length === 0 ? (
              <p className="text-[13.5px] text-dc-ink-2">Chưa có ai.</p>
            ) : (
              going.map((id) => (
                <span key={id} className="rounded-lg bg-dc-bone px-2 py-1 text-[12.5px] text-dc-ink">
                  {memberName(id)}
                </span>
              ))
            )}
          </div>
          {out.length > 0 && (
            <p className="mt-3 text-[13px] text-dc-ink-2">Báo vắng: {out.map((id) => memberName(id)).join(", ")}</p>
          )}
          {s.note ? <p className="mt-3 text-[13px] text-dc-ink-2">{s.note}</p> : null}
        </div>

        <Link
          href={`/the-thao/${sp.slug}/giao-luu`}
          className="mt-7 inline-flex items-center gap-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-ink-2 transition-colors hover:text-dc-gold"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Tất cả buổi giao lưu
        </Link>
      </Section>
    </>
  );
}
