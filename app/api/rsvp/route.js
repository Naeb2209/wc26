import { NextResponse } from "next/server";
import { findSession, memberById } from "@/lib/dc42";
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

  const { sessionId, memberId, status } = body || {};
  const session = sessionId && findSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "Không tìm thấy buổi giao lưu" }, { status: 404 });
  if (session.cancelled) return NextResponse.json({ ok: false, error: "Buổi này đã huỷ" }, { status: 409 });
  if (!memberById(memberId)) return NextResponse.json({ ok: false, error: "Không tìm thấy thành viên" }, { status: 404 });
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
