"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/fantasy", label: "Fantasy" },
  { href: "/standings", label: "Bảng đấu" },
  { href: "/teams", label: "Đội bóng" },
  { href: "/schedule", label: "Lịch thi đấu" },
  { href: "/live", label: "Trực tiếp" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href, mobile = false) =>
    [
      "font-label-caps text-label-caps uppercase transition-colors whitespace-nowrap",
      mobile ? "py-3 px-2 block rounded-lg" : "px-1 py-2 border-b-2",
      isActive(href)
        ? mobile
          ? "text-primary font-bold bg-primary/5"
          : "text-primary font-bold border-primary"
        : mobile
        ? "text-on-surface-variant hover:bg-surface-container-low"
        : "text-on-surface-variant font-medium hover:text-primary border-transparent",
    ].join(" ");

  return (
    <nav className="bg-surface border-b border-outline-variant sticky top-0 z-50 w-full">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 md:h-20 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary text-on-primary shrink-0">
            <span className="material-symbols-outlined text-[22px]">sports_soccer</span>
          </span>
          <span className="leading-none">
            <span className="block font-display-lg text-[18px] md:text-[20px] text-surface-tint uppercase tracking-tight">
              World Cup
            </span>
            <span className="block font-label-caps text-[11px] tracking-widest text-on-surface-variant">
              FIFA 2026
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button className="text-primary hover:bg-surface-container-low transition-all p-2 rounded-full">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button className="bg-primary text-on-primary font-label-caps text-label-caps px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors uppercase">
            Tickets
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-primary p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Mở menu"
          aria-expanded={open}
        >
          <span className="material-symbols-outlined text-[28px]">{open ? "close" : "menu"}</span>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-outline-variant bg-surface px-margin-mobile py-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href, true)} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-outline-variant">
            <button className="flex-1 bg-primary text-on-primary font-label-caps text-label-caps py-2.5 rounded-full uppercase">
              Tickets
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
