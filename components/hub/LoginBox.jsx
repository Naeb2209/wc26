"use client";

import { useEffect, useRef, useState } from "react";

/* Đăng nhập / đăng ký / đặt mật khẩu của trang giao lưu.

   Trên trang chỉ để một dải gọn; form nằm trong modal để dễ thấy. SessionList mở modal
   qua openRef.current(mode, lờiNhắc) — vd khi bấm "Tôi tham gia" lúc chưa đăng nhập.

   Mỗi người một mật khẩu riêng. Tài khoản cũ chưa có mật khẩu riêng thì vào lần đầu bằng
   mật khẩu nhóm, xong modal chuyển ngay sang bước "Đặt mật khẩu riêng" — chưa đặt thì
   server không cho điểm danh. Xem lib/auth.js. */

const INPUT =
  "w-full rounded-xl border border-dc-line bg-white px-3.5 py-3 text-[15px] text-dc-ink outline-none focus:border-dc-ink";
const PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-dc-ink px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35";
const GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-dc-line px-5 py-2.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink disabled:opacity-40";

const TITLE = { login: "Đăng nhập", signup: "Tạo tài khoản", password: "Mật khẩu riêng" };

export default function LoginBox({ user, onChange, openRef, shared }) {
  const [mode, setMode] = useState(null); // null = đóng | "login" | "signup" | "password"
  const [notice, setNotice] = useState(""); // lời nhắc khi modal mở từ nơi khác
  const [form, setForm] = useState({ username: "", name: "", password: "", confirm: "", group: "", current: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  const signingUp = mode === "signup";
  const settingPassword = mode === "password";
  const mustSet = !!user?.needsPassword; // vào bằng mật khẩu nhóm, chưa có mật khẩu riêng
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  function open(next = "login", hint) {
    setMode(next);
    setError("");
    setNotice(hint ?? "");
  }
  function close() {
    if (busy) return;
    setMode(null);
    setError("");
    setNotice("");
    setForm((f) => ({ ...f, password: "", confirm: "", group: "", current: "" }));
  }

  if (openRef) openRef.current = open;

  // Đang đăng nhập mà chưa có mật khẩu riêng (vd tải lại trang) -> nhắc đặt luôn.
  useEffect(() => {
    if (mustSet && !mode) open("password", "Lần đầu vào: đặt mật khẩu riêng để không ai điểm danh hộ bạn.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mustSet]);

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
      onChange(data.user);
      if (data.user?.needsPassword) {
        // Vào bằng mật khẩu nhóm -> chuyển thẳng sang bước đặt mật khẩu riêng.
        open("password", "Lần đầu vào: đặt mật khẩu riêng để không ai điểm danh hộ bạn.");
      } else {
        setMode(null);
        setNotice("");
      }
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
      setMode(null);
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  const strip = user ? (
    <div className="flex flex-col gap-3 rounded-2xl border border-dc-line bg-dc-paper px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Đang đăng nhập</p>
        <p className="mt-0.5 font-dc-display text-[17px] font-bold text-dc-ink">{user.name}</p>
        {mustSet ? (
          <p className="mt-0.5 text-[12.5px] text-red-700">Chưa đặt mật khẩu riêng — đặt xong mới điểm danh được.</p>
        ) : shared ? null : (
          <p className="mt-0.5 text-[12.5px] text-dc-ink-2">Chưa nối KV nên điểm danh chỉ lưu tạm trên server này.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => open("password")} disabled={busy} className={mustSet ? PRIMARY : GHOST}>
          <span className="material-symbols-outlined text-[16px]">key</span>
          {mustSet ? "Đặt mật khẩu" : "Đổi mật khẩu"}
        </button>
        <button type="button" onClick={logout} disabled={busy} className={GHOST}>
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Đăng xuất
        </button>
      </div>
    </div>
  ) : (
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
  );

  const defaultNotice = signingUp
    ? "Tự đặt mật khẩu riêng. Mật khẩu nhóm chỉ để chứng minh bạn là người trong nhóm — hỏi chủ kèo nếu chưa biết."
    : settingPassword
      ? mustSet
        ? "Lần đầu vào: đặt mật khẩu riêng để không ai điểm danh hộ bạn."
        : "Đổi xong thì máy khác đang đăng nhập tài khoản này sẽ bị đăng xuất."
      : "Tài khoản cũ chưa đặt mật khẩu riêng thì lần đầu vào bằng mật khẩu nhóm.";

  return (
    <>
      {strip}

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
              <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">DC42 · Điểm danh</p>
              <h2 id="dc42-auth-title" className="mt-1 font-dc-display text-[24px] font-bold leading-tight text-dc-ink">
                {settingPassword ? (mustSet ? "Đặt mật khẩu riêng" : "Đổi mật khẩu") : TITLE[mode]}
              </h2>
              <p className="mt-1 text-[13.5px] text-dc-ink-2">{notice || defaultNotice}</p>
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
                    onClick={() => open(key, notice)}
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
          </form>
        </div>
      ) : null}
    </>
  );
}
