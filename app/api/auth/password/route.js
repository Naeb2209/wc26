import { NextResponse } from "next/server";
import { changePassword, publicUser, sessionFrom, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Đặt / đổi mật khẩu riêng: { current, password }.
    `current` chỉ cần khi tài khoản đã có mật khẩu riêng. Xong thì cấp cookie mới —
    mọi cookie cũ của tài khoản này (kể cả máy khác) hết hiệu lực. */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  const who = await sessionFrom(req);
  if (!who) return NextResponse.json({ ok: false, error: "Đăng nhập trước đã" }, { status: 401 });

  let result;
  try {
    result = await changePassword(who, body?.current, body?.password);
  } catch (e) {
    console.error("[dc42-password] Lỗi lưu mật khẩu:", e.message);
    return NextResponse.json({ ok: false, error: "Không lưu được mật khẩu, thử lại sau." }, { status: 500 });
  }
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  return setSessionCookie(NextResponse.json({ ok: true, user: publicUser(result.session) }), who.username);
}
