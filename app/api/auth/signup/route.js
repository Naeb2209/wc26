import { NextResponse } from "next/server";
import { setSessionCookie, signup } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Tự đăng ký: { username, name, password } — password là mật khẩu chung của nhóm.
    Thành công thì đăng nhập luôn, khỏi phải gõ lại. */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  let result;
  try {
    result = await signup(body?.username, body?.name, body?.password);
  } catch (e) {
    console.error("[dc42-signup] Lỗi lưu tài khoản:", e.message);
    return NextResponse.json({ ok: false, error: "Không lưu được tài khoản, thử lại sau." }, { status: 500 });
  }
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const s = result.session;
  const user = { username: s.username, memberId: s.member.id, name: s.member.short || s.member.name };
  return setSessionCookie(NextResponse.json({ ok: true, user }), s.username);
}
