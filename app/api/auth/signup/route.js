import { NextResponse } from "next/server";
import { publicUser, setSessionCookie, signup } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Tự đăng ký: { username, name, groupPassword, password }.
    groupPassword là mật khẩu chung của nhóm (cửa chặn), password là mật khẩu riêng.
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
    result = await signup(body?.username, body?.name, body?.groupPassword, body?.password);
  } catch (e) {
    console.error("[dc42-signup] Lỗi lưu tài khoản:", e.message);
    return NextResponse.json({ ok: false, error: "Không lưu được tài khoản, thử lại sau." }, { status: 500 });
  }
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const s = result.session;
  return setSessionCookie(NextResponse.json({ ok: true, user: publicUser(s) }), s.username);
}
