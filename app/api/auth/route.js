import { NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, login, sessionFrom, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const shape = (s) => ({ username: s.username, memberId: s.member.id, name: s.member.short || s.member.name });

/** Ai đang đăng nhập ở máy này. */
export async function GET(req) {
  const s = sessionFrom(req);
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

  const s = login(body?.username, body?.password);
  if (!s) return NextResponse.json({ ok: false, error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });

  const res = NextResponse.json({ ok: true, user: shape(s) });
  res.cookies.set(COOKIE_NAME, signSession(s.username), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** Đăng xuất. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true, user: null });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
