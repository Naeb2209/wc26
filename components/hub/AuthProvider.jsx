"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/* Trạng thái đăng nhập dùng chung cho cả site.

   Trước đây chỉ trang Giao lưu biết ai đang đăng nhập, nên muốn đăng xuất / đổi mật khẩu
   phải vào tận trang đó. Giờ provider nằm ở layout: menu tài khoản trên rail (trang nào
   cũng thấy) và dải điểm danh của trang Giao lưu cùng đọc một `user`, cùng mở một modal.

   useAuth() -> { user, ready, setUser, openAuth(mode, lờiNhắc), logout }
   mode: "login" | "signup" | "password".

   Mỗi người một mật khẩu riêng. Tài khoản cũ chưa có mật khẩu riêng thì vào lần đầu bằng
   mật khẩu nhóm, xong modal chuyển ngay sang bước "Đặt mật khẩu riêng" — chưa đặt thì
   server không cho điểm danh. Xem lib/auth.js. */

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}

const FIRST_TIME = "Lần đầu vào: đặt mật khẩu riêng để không ai điểm danh hộ bạn.";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // đã hỏi server xong chưa (tránh nháy nút "Đăng nhập")
  const [modal, setModal] = useState(null); // null | { mode, hint }

  // Cookie là httpOnly nên client không đọc được -> hỏi server xem ai đang đăng nhập.
  useEffect(() => {
    let alive = true;
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => alive && d.ok && setUser(d.user))
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const openAuth = useCallback((mode = "login", hint = "") => setModal({ mode, hint }), []);

  // Đang đăng nhập mà chưa có mật khẩu riêng (vd tải lại trang) -> nhắc đặt luôn.
  useEffect(() => {
    if (user?.needsPassword) setModal((m) => m || { mode: "password", hint: FIRST_TIME });
  }, [user?.needsPassword]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      setModal(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, setUser, openAuth, logout }), [user, ready, openAuth, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {modal ? (
        <AuthModal
          user={user}
          mode={modal.mode}
          hint={modal.hint}
          onMode={(mode) => setModal((m) => ({ ...m, mode }))}
          onClose={() => setModal(null)}
          onDone={(next) => {
            setUser(next);
            setModal(next?.needsPassword ? { mode: "password", hint: FIRST_TIME } : null);
          }}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

/* ---------------- modal ---------------- */

const INPUT =
  "w-full rounded-xl border border-dc-line bg-white px-3.5 py-3 text-[15px] text-dc-ink outline-none focus:border-dc-ink";
const PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-dc-ink px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35";

const TITLE = { login: "Đăng nhập", signup: "Tạo tài khoản", password: "Mật khẩu riêng" };

function AuthModal({ user, mode, hint, onMode, onClose, onDone }) {
  const [form, setForm] = useState({ username: "", name: "", password: "", confirm: "", group: "", current: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  const signingUp = mode === "signup";
  const settingPassword = mode === "password";
  const mustSet = !!user?.needsPassword; // vào bằng mật khẩu nhóm, chưa có mật khẩu riêng
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  function close() {
    if (!busy) onClose();
  }

  // Focus ô đầu mỗi lần đổi bước, Esc để đóng, khoá cuộn trang phía sau.
  useEffect(() => {
    firstRef.current?.focus();
    setError("");
  }, [mode]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function submit(e) {
    e.preventDefault();
    if ((signingUp || settingPassword) && form.password !== form.confirm) {
      setError("Hai lần nhập mật khẩu không khớp.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const [url, body] = signingUp
        ? ["/api/auth/signup", { username: form.username, name: form.name, password: form.password, groupPassword: form.group }]
        : settingPassword
          ? ["/api/auth/password", { current: form.current, password: form.password }]
          : ["/api/auth", { username: form.username, password: form.password }];
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Không được, thử lại giúp mình.");
        return;
      }
      setForm((f) => ({ ...f, name: "", password: "", confirm: "", group: "", current: "" }));
      onDone(data.user);
    } catch {
      setError("Mất kết nối, thử lại giúp mình.");
    } finally {
      setBusy(false);
    }
  }

  const defaultNotice = signingUp
    ? "Tự đặt mật khẩu riêng. Mật khẩu nhóm chỉ để chứng minh bạn là người trong nhóm — hỏi chủ kèo nếu chưa biết."
    : settingPassword
      ? mustSet
        ? FIRST_TIME
        : "Đổi xong thì máy khác đang đăng nhập tài khoản này sẽ bị đăng xuất."
      : "Tài khoản cũ chưa đặt mật khẩu riêng thì lần đầu vào bằng mật khẩu nhóm.";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc42-auth-title"
        onSubmit={submit}
        className="relative flex max-h-full w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
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
          <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">
            {settingPassword && user ? `DC42 · ${user.name} (@${user.username})` : "DC42 · Tài khoản"}
          </p>
          <h2 id="dc42-auth-title" className="mt-1 font-dc-display text-[24px] font-bold leading-tight text-dc-ink">
            {settingPassword ? (mustSet ? "Đặt mật khẩu riêng" : "Đổi mật khẩu") : TITLE[mode]}
          </h2>
          <p className="mt-1 text-[13.5px] text-dc-ink-2">{hint || defaultNotice}</p>
        </div>

        {/* Hai tab đăng nhập / đăng ký, đổi qua lại giữ nguyên những gì đã gõ. */}
        {settingPassword ? null : (
          <div className="grid grid-cols-2 rounded-full bg-dc-bone p-1">
            {[
              ["login", "Đăng nhập"],
              ["signup", "Đăng ký"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onMode(key)}
                className={`rounded-full py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  mode === key ? "bg-white text-dc-ink shadow-sm" : "text-dc-ink-2 hover:text-dc-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {signingUp ? (
            <input ref={firstRef} {...field("name")} autoComplete="nickname" placeholder="Tên hiển thị (vd: Bean)" className={INPUT} />
          ) : null}

          {settingPassword ? (
            <>
              {/* username ẩn để trình duyệt biết lưu mật khẩu cho tài khoản nào */}
              <input type="text" autoComplete="username" value={user?.username || ""} readOnly hidden />
              {mustSet ? null : (
                <input
                  ref={firstRef}
                  {...field("current")}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Mật khẩu hiện tại"
                  className={INPUT}
                />
              )}
            </>
          ) : (
            <input
              ref={signingUp ? undefined : firstRef}
              {...field("username")}
              autoComplete="username"
              autoCapitalize="none"
              placeholder={signingUp ? "Tên đăng nhập (vd: bean)" : "Tên đăng nhập"}
              className={INPUT}
            />
          )}

          <input
            ref={settingPassword && mustSet ? firstRef : undefined}
            {...field("password")}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Mật khẩu" : settingPassword && !mustSet ? "Mật khẩu mới" : "Mật khẩu riêng (ít nhất 4 ký tự)"}
            className={INPUT}
          />
          {mode === "login" ? null : (
            <input {...field("confirm")} type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" className={INPUT} />
          )}
          {signingUp ? (
            <input {...field("group")} type="password" autoComplete="off" placeholder="Mật khẩu nhóm" className={INPUT} />
          ) : null}
        </div>

        {error ? <p className="-mt-1 text-[13px] text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={
            busy ||
            !form.password ||
            (mode === "login" && !form.username) ||
            (signingUp && (!form.username || !form.name || !form.group)) ||
            (settingPassword && !mustSet && !form.current)
          }
          className={`${PRIMARY} w-full py-3`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {signingUp ? "person_add" : settingPassword ? "key" : "login"}
          </span>
          {busy ? "Đang gửi…" : signingUp ? "Tạo tài khoản" : settingPassword ? "Lưu mật khẩu" : "Đăng nhập"}
        </button>
        {/* Quên mật khẩu: chưa có email nên không tự đặt lại được — xổ ra cách nhờ reset. */}
        {mode === "login" ? (
          <details className="group rounded-2xl bg-dc-bone px-4 py-3 text-[13px] text-dc-ink-2">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-dc-ink [&::-webkit-details-marker]:hidden">
              Quên mật khẩu?
              <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Nhắn chủ kèo (hoặc admin nhóm) tên đăng nhập của bạn để được reset.</li>
              <li>Khi được báo đã reset, đăng nhập bằng tên đăng nhập + <b>mật khẩu nhóm</b>.</li>
              <li>Hub tự chuyển sang bước <b>Đặt mật khẩu riêng</b> — đặt mật khẩu mới là xong.</li>
            </ol>
            <p className="mt-2">Quên luôn tên đăng nhập? Hỏi chủ kèo, tên đăng nhập không phải bí mật.</p>
          </details>
        ) : null}
      </form>
    </div>
  );
}
