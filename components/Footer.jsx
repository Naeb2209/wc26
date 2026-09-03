import Link from "next/link";

const LINKS = [
  { href: "/the-thao/bong-da", label: "Bóng đá" },
  { href: "/the-thao/cau-long", label: "Cầu lông" },
  { href: "/su-kien", label: "Sự kiện" },
  { href: "/moments", label: "Moments" },
  { href: "/bang-tin", label: "Bảng tin" },
];

export default function Footer() {
  return (
    <footer className="mt-auto w-full bg-dc-ink px-margin-mobile py-10 md:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center justify-between gap-6 md:flex-row md:items-start">
        <div>
          <p className="font-dc-display text-[26px] font-bold italic leading-none text-white">
            DC<span className="text-dc-gold">42</span>
          </p>
          <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-white/60">
            Sân chơi của anh em DC: thể thao hằng tuần, giải đấu trong năm, sự kiện ngày đặc biệt và kho ảnh chung.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-dc-gold"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-[12px] text-white/50 md:text-right">
          Nội bộ DC · TMA
          <span className="block">Dữ liệu World Cup 2026 dùng cho tab Fantasy.</span>
        </p>
      </div>
    </footer>
  );
}
