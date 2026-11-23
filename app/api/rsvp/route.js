import { NextResponse } from "next/server";
import { findSession, splitAt, splitsTeams } from "@/lib/dc42";
import { sessionFrom } from "@/lib/auth";
import { getRsvp, setRsvp, rosterOf, RSVP_IN, RSVP_OUT } from "@/lib/dc42-rsvp";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const session = sessionId && findSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "Không tìm thấy buổi giao lưu" }, { status: 404 });

  const overrides = await getRsvp(sessionId);
  return NextResponse.json({ ok: true, sessionId, ...rosterOf(session, overrides) });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  const who = await sessionFrom(req);
  if (!who) return NextResponse.json({ ok: false, error: "Đăng nhập trước đã" }, { status: 401 });

  // Danh tính lấy từ cookie đã ký, không lấy từ body -> không điểm danh hộ người khác được.
  const memberId = who.member.id;
  const { sessionId, status } = body || {};
  const session = sessionId && findSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "Không tìm thấy buổi giao lưu" }, { status: 404 });
  if (session.cancelled) return NextResponse.json({ ok: false, error: "Buổi này đã huỷ" }, { status: 409 });
  // Buổi đã bốc thăm chia đội thì danh sách chốt luôn — nút ở client đã khoá, chặn ở đây
  // để đội đã chia không đổi vì một lượt gọi thẳng API.
  if (splitsTeams(session) && Date.now() >= splitAt(session)) {
    return NextResponse.json({ ok: false, error: "Đã chốt danh sách và chia đội cho buổi này" }, { status: 409 });
  }
  if (status !== RSVP_IN && status !== RSVP_OUT) {
    return NextResponse.json({ ok: false, error: "status phải là 'in' hoặc 'out'" }, { status: 400 });
  }

  const before = await getRsvp(sessionId);
  const { going, slotsLeft } = rosterOf(session, before);
  if (status === RSVP_IN && slotsLeft === 0 && !going.includes(memberId)) {
    return NextResponse.json({ ok: false, error: "Buổi này đã đủ người" }, { status: 409 });
  }

  await setRsvp(sessionId, memberId, status);
  const overrides = await getRsvp(sessionId);
  return NextResponse.json({ ok: true, sessionId, memberId, status, ...rosterOf(session, overrides) });
}
