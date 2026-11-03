"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
        <Link href="/the-thao" className="rail__foot-btn rail__foot-btn--cta">
          <span className="material-symbols-outlined" data-anim="how_to_reg">how_to_reg</span>
          <span className="rail__label">Điểm danh</span>
        </Link>
      </div>
    </nav>
  );
}
