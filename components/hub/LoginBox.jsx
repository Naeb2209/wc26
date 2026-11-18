"use client";

import { useState } from "react";

/* Ô đăng nhập của trang giao lưu.

   Tài khoản khai sẵn trong data (accounts[]), mật khẩu dùng chung — xem lib/auth.js.
   Đăng nhập xong server set cookie httpOnly, nên từ đó mọi lượt điểm danh đều gắn đúng
   người; client không tự khai memberId được nữa. */

export default function LoginBox({ user, onChange, focusRef, shared }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Đăng nhập không được.");
        return;
      }
      setPassword("");
      onChange(data.user);
    } catch {
      setError("Mất kết nối, thử lại giúp mình.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dc-line bg-dc-paper px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Đang đăng nhập</p>
          <p className="mt-0.5 font-dc-display text-[17px] font-bold text-dc-ink">{user.name}</p>
          {shared ? null : (
            <p className="mt-0.5 text-[12.5px] text-dc-ink-2">Chưa nối KV nên điểm danh chỉ lưu tạm trên server này.</p>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-dc-line px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink disabled:opacity-40 md:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-dc-line bg-dc-paper px-5 py-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Đăng nhập</p>
        <p className="mt-0.5 text-[13.5px] text-dc-ink-2">
          Đăng nhập rồi mới điểm danh được — để không ai đi hộ ai.
          {shared ? "" : " Chưa nối KV nên điểm danh chỉ lưu tạm trên server này."}
        </p>
        {error ? <p className="mt-1 text-[13px] text-red-700">{error}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={focusRef}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="Tên đăng nhập"
          className="w-full rounded-xl border border-dc-line bg-white px-3 py-2.5 text-[13.5px] text-dc-ink md:w-40"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Mật khẩu"
          className="w-full rounded-xl border border-dc-line bg-white px-3 py-2.5 text-[13.5px] text-dc-ink md:w-32"
        />
        <button
          type="submit"
          disabled={busy || !username}
          className="inline-flex items-center gap-1.5 rounded-full bg-dc-ink px-4 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="material-symbols-outlined text-[16px]">login</span>
          Vào
        </button>
      </div>
    </form>
  );
}
