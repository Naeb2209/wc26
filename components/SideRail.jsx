"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./hub/AuthProvider";

/* Rail điều hướng dọc của DC42 Hub (dựng theo layout side-rail của Esports World Cup):
   cột trắng cố định 110px bên trái ở desktop, chuyển thành bottom bar ở mobile. */

const LINKS = [
  { href: "/", label: "Trang chủ", icon: "home", exact: true },
  // Hai nhánh nội dung tách rời: thể thao (chia theo môn) và sự kiện ngày đặc biệt.
  { href: "/the-thao", label: "Thể thao", icon: "sports_soccer" },
  { href: "/su-kien", label: "Sự kiện", icon: "celebration" },
  { href: "/xep-hang", label: "Xếp hạng", icon: "workspace_premium" },
  { href: "/moments", label: "Moments", icon: "photo_library" },
  { href: "/bang-tin", label: "Bảng tin", icon: "campaign" },
];

// Lối tắt: Fantasy nằm trong Thể thao › Bóng đá, còn đây là dữ liệu World Cup đi kèm module đó.
const MORE = [
  { href: "/fantasy", label: "Fantasy World Cup", icon: "stadium" },
  { href: "/standings", label: "Bảng đấu World Cup", icon: "table_rows" },
  { href: "/teams", label: "Đội bóng World Cup", icon: "flag" },
  { href: "/schedule", label: "Lịch World Cup", icon: "calendar_month" },
  { href: "/live", label: "Trực tiếp", icon: "sensors" },
];

export default function SideRail() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const isActive = (l) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));
  const moreActive = MORE.some((l) => pathname.startsWith(l.href));

  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <nav aria-label="Điều hướng chính" className="rail">
      <Link href="/" className="rail__brand" aria-label="DC42 – trang chủ">
        <span className="rail__wordmark">
          DC<span>42</span>
        </span>
      </Link>

      <div className="rail__scroll">
        <ul className="rail__list">
          {LINKS.map((l) => (
            <li key={l.href} className="rail__slot">
              <Link href={l.href} className="rail__item" aria-current={isActive(l) ? "page" : undefined}>
                <span className="material-symbols-outlined" data-anim={l.icon}>{l.icon}</span>
                <span className="rail__label">{l.label}</span>
              </Link>
            </li>
          ))}

          <li className="rail__slot" ref={moreRef}>
            <button
              type="button"
              className="rail__item"
              aria-haspopup="true"
              aria-expanded={moreOpen}
              aria-current={moreActive ? "page" : undefined}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span className="material-symbols-outlined" data-anim="more_horiz">more_horiz</span>
              <span className="rail__label">More</span>
            </button>

            {moreOpen && (
              <div className="rail__flyout" role="menu">
                <p className="rail__flyout-head">Lối tắt · World Cup 2026</p>
                {MORE.map((l) => (
                  <Link key={l.href} href={l.href} role="menuitem" className="rail__flyout-item">
                    <span className="material-symbols-outlined" data-anim={l.icon}>{l.icon}</span>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        </ul>
      </div>

      <div className="rail__foot">
        <button type="button" className="rail__foot-btn rail__foot-btn--lang">
          <span className="material-symbols-outlined" data-anim="language">language</span>
          <span className="rail__label">Tiếng Việt</span>
        </button>
        <AccountMenu pathname={pathname} />
      </div>
    </nav>
  );
}

/* Ô tài khoản ở chân rail (bottom bar ở mobile) — trang nào cũng thấy.
   Chưa đăng nhập: nút "Đăng nhập" mở modal. Đã đăng nhập: chữ cái đầu + tên, bấm xổ menu
   Điểm danh / Đổi mật khẩu / Đăng xuất. Trước đây mấy nút này chỉ có ở trang Giao lưu. */
function AccountMenu({ pathname }) {
  const { user, ready, openAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const mustSet = !!user?.needsPassword;

  useEffect(() => setOpen(false), [pathname, user]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <button
        type="button"
        className="rail__foot-btn rail__foot-btn--cta"
        onClick={() => openAuth("login")}
        // Chưa hỏi xong server thì chưa biết là ai — tránh nháy chữ "Đăng nhập" rồi đổi tên.
        style={ready ? undefined : { visibility: "hidden" }}
      >
        <span className="material-symbols-outlined" data-anim="login">login</span>
        <span className="rail__label">Đăng nhập</span>
      </button>
    );
  }

  return (
    <div className="rail__account" ref={ref}>
      <button
        type="button"
        className="rail__foot-btn rail__foot-btn--cta"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rail__avatar" aria-hidden="true">
          {(user.name || user.username || "?").trim().charAt(0).toUpperCase()}
          {mustSet ? <span className="rail__avatar-dot" /> : null}
        </span>
        <span className="rail__label">{user.name}</span>
      </button>

      {open && (
        <div className="rail__flyout rail__flyout--account" role="menu">
          <div className="rail__account-head">
            <p className="rail__account-name">{user.name}</p>
            <p className="rail__account-user">@{user.username}</p>
            {mustSet ? <p className="rail__account-warn">Chưa đặt mật khẩu riêng</p> : null}
          </div>
          <Link href="/the-thao" role="menuitem" className="rail__flyout-item">
            <span className="material-symbols-outlined">how_to_reg</span>
            Điểm danh
          </Link>
          <button
            type="button"
            role="menuitem"
            className="rail__flyout-item"
            onClick={() => {
              setOpen(false);
              openAuth("password");
            }}
          >
            <span className="material-symbols-outlined">key</span>
            {mustSet ? "Đặt mật khẩu" : "Đổi mật khẩu"}
          </button>
          <button type="button" role="menuitem" className="rail__flyout-item rail__flyout-item--danger" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
