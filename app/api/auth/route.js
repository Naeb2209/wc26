import { NextResponse } from "next/server";
import { COOKIE_NAME, login, sessionFrom, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const shape = (s) => ({ username: s.username, memberId: s.member.id, name: s.member.short || s.member.name });

/** Ai đang đăng nhập ở máy này. */
export async function GET(req) {
  const s = await sessionFrom(req);
  return NextResponse.json({ ok: true, user: s ? shape(s) : null });
}

/** Đăng nhập: { username, password }. */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  const s = await login(body?.username, body?.password);
  if (!s) return NextResponse.json({ ok: false, error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });

  return setSessionCookie(NextResponse.json({ ok: true, user: shape(s) }), s.username);
}

/** Đăng xuất. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true, user: null });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
