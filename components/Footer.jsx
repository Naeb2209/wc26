export default function Footer() {
  const links = ["Privacy Policy", "Terms of Service", "Sponsorships", "Contact Us", "Media Kit"];
  return (
    <footer className="bg-on-surface w-full py-8 px-margin-mobile md:px-margin-desktop mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-on-primary shrink-0">
            <span className="material-symbols-outlined text-[20px]">sports_soccer</span>
          </span>
          <span className="leading-none">
            <span className="block font-display-lg text-[16px] text-on-primary uppercase tracking-tight">World Cup</span>
            <span className="block font-label-caps text-[10px] tracking-widest text-surface-variant">FIFA 2026</span>
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((l) => (
            <a
              key={l}
              href="#"
              className="font-label-caps text-label-caps text-surface-variant hover:text-tertiary-fixed-dim transition-colors uppercase opacity-90 hover:opacity-100"
            >
              {l}
            </a>
          ))}
        </nav>

        {/* Copyright */}
        <div className="font-data-mono text-[12px] text-tertiary-fixed text-center md:text-right opacity-90">
          © 2026 FIFA World Cup. Official Broadcaster: VTV.
        </div>
      </div>
    </footer>
  );
}
