"use client";

import { useAuth } from "./AuthProvider";

/* Dải trạng thái điểm danh ở đầu trang Giao lưu. Modal đăng nhập / đăng ký / đổi mật khẩu
   và trạng thái người dùng nằm ở AuthProvider (layout), nên menu tài khoản trên rail —
   trang nào cũng thấy — và dải này luôn nói cùng một điều. */

const PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-dc-ink px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35";
const GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-dc-line px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink disabled:opacity-40";
const BOX =
  "flex flex-col gap-3 rounded-2xl border border-dc-line bg-dc-paper px-5 py-4 md:flex-row md:items-center md:justify-between";

export default function LoginBox({ shared }) {
  const { user, ready, openAuth, logout } = useAuth();
  const mustSet = !!user?.needsPassword;
  const kvNote = shared ? null : " Chưa nối KV nên điểm danh chỉ lưu tạm trên server này.";

  // Chưa hỏi xong server thì giữ chỗ, khỏi nháy nút Đăng nhập với người đã đăng nhập.
  if (!ready) return <div className={`${BOX} min-h-[78px]`} aria-hidden="true" />;

  if (user) {
    return (
      <div className={BOX}>
        <div>
          <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Đang đăng nhập</p>
          <p className="mt-0.5 font-dc-display text-[17px] font-bold text-dc-ink">
            {user.name} <span className="text-[13px] font-semibold text-dc-ink-2">@{user.username}</span>
          </p>
          {mustSet ? (
            <p className="mt-0.5 text-[12.5px] text-red-700">Chưa đặt mật khẩu riêng — đặt xong mới điểm danh được.</p>
          ) : kvNote ? (
            <p className="mt-0.5 text-[12.5px] text-dc-ink-2">{kvNote.trim()}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openAuth("password")} className={mustSet ? PRIMARY : GHOST}>
            <span className="material-symbols-outlined text-[16px]">key</span>
            {mustSet ? "Đặt mật khẩu" : "Đổi mật khẩu"}
          </button>
          <button type="button" onClick={logout} className={GHOST}>
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={BOX}>
      <div>
        <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Điểm danh</p>
        <p className="mt-0.5 text-[13.5px] text-dc-ink-2">
          Đăng nhập rồi mới điểm danh được — lần đầu thì bấm Đăng ký.
          {kvNote}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => openAuth("login")} className={PRIMARY}>
          <span className="material-symbols-outlined text-[16px]">login</span>
          Đăng nhập
        </button>
        <button type="button" onClick={() => openAuth("signup")} className={GHOST}>
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Đăng ký
        </button>
      </div>
    </div>
  );
}
