"use client";

import { useEffect, useRef, useState } from "react";

/* Đăng nhập / đăng ký của trang giao lưu.

   Trên trang chỉ để một dải gọn với hai nút; form nằm trong modal để dễ thấy, nhất là
   khi bấm "Tôi tham gia" lúc chưa đăng nhập — SessionList gọi openRef.current("login").

   Tài khoản khai sẵn trong data (accounts[]) hoặc tự đăng ký (lưu ở KV), mật khẩu dùng
   chung của nhóm — xem lib/auth.js. Đăng nhập xong server set cookie httpOnly, nên từ đó
   mọi lượt điểm danh đều gắn đúng người; client không tự khai memberId được nữa. */

const INPUT =
  "w-full rounded-xl border border-dc-line bg-white px-3.5 py-3 text-[15px] text-dc-ink outline-none focus:border-dc-ink";
const PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-dc-ink px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35";
const GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-dc-line px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink disabled:opacity-40";

export default function LoginBox({ user, onChange, openRef, shared }) {
  const [mode, setMode] = useState(null); // null = đóng | "login" | "signup"
  const [notice, setNotice] = useState(""); // lời nhắc khi modal mở từ nút điểm danh
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);
  const signingUp = mode === "signup";

  function open(next = "login", hint) {
    setMode(next);
    setError("");
    if (hint !== undefined) setNotice(hint);
  }
  function close() {
    if (busy) return;
    setMode(null);
    setError("");
    setNotice("");
  }

  if (openRef) openRef.current = open;

  // Mở modal: focus ô đầu, Esc để đóng, khoá cuộn trang phía sau.
  useEffect(() => {
    if (!mode) return;
    firstRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(signingUp ? "/api/auth/signup" : "/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signingUp ? { username, name, password } : { username, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || (signingUp ? "Đăng ký không được." : "Đăng nhập không được."));
        return;
      }
      setPassword("");
      setName("");
      setMode(null);
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
        <button type="button" onClick={logout} disabled={busy} className={`${GHOST} self-start md:self-auto`}>
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-dc-line bg-dc-paper px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Điểm danh</p>
          <p className="mt-0.5 text-[13.5px] text-dc-ink-2">
            Đăng nhập rồi mới điểm danh được — lần đầu thì bấm Đăng ký.
            {shared ? "" : " Chưa nối KV nên điểm danh chỉ lưu tạm trên server này."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => open("login")} className={PRIMARY}>
            <span className="material-symbols-outlined text-[16px]">login</span>
            Đăng nhập
          </button>
          <button type="button" onClick={() => open("signup")} className={GHOST}>
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Đăng ký
          </button>
        </div>
      </div>

      {mode ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="dc42-auth-title"
            onSubmit={submit}
            className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Đóng"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-dc-ink-2 hover:bg-dc-bone hover:text-dc-ink"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="pr-8">
              <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">DC42 · Điểm danh</p>
              <h2 id="dc42-auth-title" className="mt-1 font-dc-display text-[24px] font-bold leading-tight text-dc-ink">
                {signingUp ? "Tạo tài khoản" : "Đăng nhập"}
              </h2>
              <p className="mt-1 text-[13.5px] text-dc-ink-2">
                {notice ||
                  (signingUp
                    ? "Mật khẩu là mật khẩu chung của nhóm — hỏi chủ kèo nếu chưa biết."
                    : "Để không ai điểm danh hộ ai.")}
              </p>
            </div>

            {/* Hai tab đổi qua lại, giữ nguyên những gì đã gõ. */}
            <div className="grid grid-cols-2 rounded-full bg-dc-bone p-1">
              {[
                ["login", "Đăng nhập"],
                ["signup", "Đăng ký"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => open(key)}
                  className={`rounded-full py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                    mode === key ? "bg-white text-dc-ink shadow-sm" : "text-dc-ink-2 hover:text-dc-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              {signingUp ? (
                <input
                  ref={firstRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                  placeholder="Tên hiển thị (vd: Bean)"
                  className={INPUT}
                />
              ) : null}
              <input
                ref={signingUp ? undefined : firstRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                placeholder={signingUp ? "Tên đăng nhập (vd: bean)" : "Tên đăng nhập"}
                className={INPUT}
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={signingUp ? "off" : "current-password"}
                placeholder={signingUp ? "Mật khẩu nhóm" : "Mật khẩu"}
                className={INPUT}
              />
            </div>

            {error ? <p className="-mt-1 text-[13px] text-red-700">{error}</p> : null}

            <button type="submit" disabled={busy || !username || (signingUp && !name)} className={`${PRIMARY} w-full py-3`}>
              <span className="material-symbols-outlined text-[16px]">{signingUp ? "person_add" : "login"}</span>
              {busy ? "Đang gửi…" : signingUp ? "Tạo tài khoản" : "Đăng nhập"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
