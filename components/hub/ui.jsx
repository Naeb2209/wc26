import Link from "next/link";

// Bộ UI dùng chung cho các tab DC42 Hub. Giữ đúng ngôn ngữ thị giác của side rail:
// chữ Chakra Petch in hoa giãn chữ cho nhãn, mực #151515, điểm nhấn vàng #987c4b.

export const SPORT_META = {
  football: { name: "Bóng đá", icon: "sports_soccer", text: "text-dc-pitch", bg: "bg-dc-pitch/10", ring: "ring-dc-pitch/30" },
  badminton: { name: "Cầu lông", icon: "sports_tennis", text: "text-dc-court", bg: "bg-dc-court/10", ring: "ring-dc-court/30" },
  // Chạy bộ chưa có hub riêng (không nằm trong sports[]), mới chỉ góp mặt ở phòng danh hiệu
  // — khai ở đây để chip có tên và icon đàng hoàng thay vì rơi về nhãn rỗng.
  running: { name: "Chạy bộ", icon: "directions_run", text: "text-dc-gold", bg: "bg-dc-gold/10", ring: "ring-dc-gold/30" },
};

export function sportMeta(id) {
  return SPORT_META[id] || { name: "", icon: "event", text: "text-dc-ink-2", bg: "bg-dc-bone", ring: "ring-dc-line" };
}

export function Eyebrow({ children, className = "" }) {
  return (
    <p className={`font-dc-display text-[11px] font-bold uppercase tracking-[0.22em] text-dc-gold ${className}`}>
      {children}
    </p>
  );
}

// wide: khung rộng hơn + lề mỏng hơn, dùng cho trang nhiều cột dữ liệu (vd tab Round của Fantasy).
const BOX = {
  normal: "max-w-container-max px-margin-mobile md:px-margin-desktop",
  wide: "max-w-[1640px] px-3 sm:px-4 md:px-6",
};

/* Lớp nền của hero tối: ảnh (nếu có) + lớp phủ, hoặc ánh vàng/đỏ trên nền mực. */
export function HeroBackdrop({ image }) {
  return (
    <>
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" aria-hidden="true" className="ewc-hero__img" />
          <span className="ewc-hero__shade" aria-hidden="true" />
        </>
      ) : (
        <span className="ewc-hero__glow" aria-hidden="true" />
      )}
    </>
  );
}

/* Nút kính mờ "Cuộn xem thêm" ở chân hero, đúng nhịp EWC: nhãn 12px in hoa + nút tròn mũi tên. */
export function ScrollCue({ href = "#noi-dung", label = "Cuộn xem thêm" }) {
  return (
    <a
      href={href}
      className="group mx-auto flex w-fit items-center gap-3.5 rounded-[18px] bg-white/15 p-1.5 ps-[22px] backdrop-blur-[32px] transition-colors hover:bg-white/25"
    >
      <span className="font-dc-display text-[12px] font-bold uppercase tracking-[0.12em] text-white">{label}</span>
      <span className="grid size-[42px] place-items-center rounded-full bg-white/10">
        <span className="material-symbols-outlined text-[20px] text-white transition-transform group-hover:translate-y-0.5">
          arrow_downward
        </span>
      </span>
    </a>
  );
}

/* Header trang theo hero của EWC: nền mực tràn ngang, chip chuyển sắc, tiêu đề display trắng.
   - hero: bản cao, canh giữa, có nút "Cuộn xem thêm" — dùng cho các tab cấp một trên rail.
   - mặc định: bản gọn canh trái — dùng cho trang con (tab trong môn, chi tiết giải/bài) để
     đổi tab không phải cuộn qua cả màn hình hero.
   - image: ảnh nền (đã phủ tối); không có thì dùng ánh vàng/đỏ trên nền mực. */
export function PageHeader({ eyebrow, title, lede, aside, wide = false, hero = false, image = null }) {
  const box = wide ? BOX.wide : BOX.normal;

  if (hero) {
    return (
      <>
        <header className="ewc-hero">
          <HeroBackdrop image={image} />
          <div
            className={`mx-auto flex min-h-[360px] w-full flex-col items-center justify-center gap-8 pb-8 pt-14 text-center md:min-h-[460px] md:pb-10 md:pt-20 ${box}`}
          >
            <div className="flex w-full max-w-4xl flex-col items-center">
              {eyebrow ? <span className="ewc-chip">{eyebrow}</span> : null}
              <h1 className="mt-5 font-dc-display text-[40px] font-bold uppercase italic leading-[0.95] tracking-tight text-white sm:text-[52px] md:text-[72px]">
                {title}
              </h1>
              {lede ? <p className="mt-5 max-w-[60ch] text-body-lg text-white/75">{lede}</p> : null}
              {aside ? <div className="mt-7">{aside}</div> : null}
            </div>
            <ScrollCue />
          </div>
        </header>
        <span id="noi-dung" className="block scroll-mt-4" aria-hidden="true" />
      </>
    );
  }

  return (
    <header className="ewc-hero">
      <HeroBackdrop image={image} />
      <div className={`mx-auto w-full py-10 md:py-14 ${box}`}>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? <span className="ewc-chip">{eyebrow}</span> : null}
            <h1 className="mt-4 font-dc-display text-[34px] font-bold italic leading-[1.02] tracking-tight text-white md:text-[52px]">
              {title}
            </h1>
            {/* Chừa sẵn 2 dòng cho lede: đổi tab trong cùng một môn thì header không nhảy chiều cao.
                Lede dài hơn 2 dòng vẫn nở bình thường. */}
            {lede ? <p className="mt-4 max-w-[62ch] text-body-lg text-white/70 md:min-h-14">{lede}</p> : null}
          </div>
          {/* aside ở các trang con (chip môn/trạng thái, tác giả bài) vốn vẽ cho nền trắng:
              đặt trong khay trắng như ô "Select Year" trên hero EWC thay vì đổi màu từng chip. */}
          {aside ? (
            <div className="w-fit shrink-0 rounded-2xl bg-white p-2.5 text-dc-ink shadow-[0_8px_24px_rgba(0,0,0,0.25)]">{aside}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function Section({ id, title, hint, action, children, className = "", wide = false }) {
  return (
    <section id={id} className={`mx-auto w-full scroll-mt-6 py-10 ${wide ? BOX.wide : BOX.normal} ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-dc-display text-[22px] font-bold leading-tight text-dc-ink md:text-[26px]">{title}</h2>
            {hint ? <p className="mt-1 text-body-md text-dc-ink-2">{hint}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chip({ children, icon, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "border-dc-line bg-white text-dc-ink-2",
    ink: "border-dc-ink bg-dc-ink text-white",
    gold: "border-dc-gold/40 bg-dc-gold-soft text-dc-gold",
    football: "border-dc-pitch/25 bg-dc-pitch/10 text-dc-pitch",
    badminton: "border-dc-court/25 bg-dc-court/10 text-dc-court",
    social: "border-dc-social/25 bg-dc-social/10 text-dc-social",
    fantasy: "border-dc-fantasy/25 bg-dc-fantasy/10 text-dc-fantasy",
    live: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-dc-display text-[11px] font-bold uppercase tracking-[0.1em] ${
        tones[tone] || tones.neutral
      } ${className}`}
    >
      {icon ? <span className="material-symbols-outlined text-[15px] leading-none">{icon}</span> : null}
      {children}
    </span>
  );
}

export function SportChip({ sport }) {
  if (!sport) return null;
  const meta = sportMeta(sport);
  return (
    <Chip tone={sport} icon={meta.icon}>
      {meta.name}
    </Chip>
  );
}

export function StatusChip({ status }) {
  if (status === "running") return <Chip tone="live" icon="sensors">Đang diễn ra</Chip>;
  if (status === "finished") return <Chip icon="check_circle">Đã kết thúc</Chip>;
  if (status === "upcoming") return <Chip tone="gold" icon="schedule">Sắp diễn ra</Chip>;
  if (status === "planned") return <Chip icon="more_horiz">Dự kiến</Chip>;
  if (status === "past") return <Chip icon="history">Đã diễn ra</Chip>;
  return null;
}

/* Ô logo giải, dùng chung cho các thẻ nhỏ (tổng quan môn, xếp hạng).
   `logoWide: true` -> ô rộng cho logo nằm ngang; `logoBg: "dark"` -> nền mực cho logo nét trắng.
   Giải chưa khai `logo` thì không hiện gì, thẻ tự thu lại. */
export function LeagueLogo({ league }) {
  if (!league?.logo) return null;
  const skin = league.logoBg === "dark" ? "border-dc-ink bg-dc-ink" : "border-dc-line bg-white";
  const shape = league.logoWide ? "h-8 w-auto max-w-[84px] px-1.5" : "size-8";
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg border p-1 ${skin} ${shape}`}>
      <img src={league.logo} alt="" aria-hidden="true" className="max-h-full w-auto max-w-full object-contain" />
    </span>
  );
}

export function Card({ as = "div", href, children, className = "", ...rest }) {
  const base = `rounded-2xl border border-dc-line bg-white ${className}`;
  if (href) {
    return (
      <Link href={href} className={`${base} block transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]`} {...rest}>
        {children}
      </Link>
    );
  }
  const Tag = as;
  return (
    <Tag className={base} {...rest}>
      {children}
    </Tag>
  );
}

export function Stat({ label, value, sub, href }) {
  const body = (
    <>
      <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">{label}</p>
      <p className="mt-1 font-dc-display text-[26px] font-bold leading-none text-dc-ink tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-[13px] text-dc-ink-2">{sub}</p> : null}
    </>
  );
  const base = "rounded-2xl border border-dc-line bg-white px-5 py-4";
  // Ô số liệu nào có mục tương ứng để xem tiếp thì cho bấm luôn — mũi vàng ở góc là dấu hiệu.
  if (href) {
    return (
      <Link href={href} className={`${base} group relative block transition-colors hover:border-dc-gold`}>
        {body}
        <span
          aria-hidden="true"
          className="material-symbols-outlined absolute right-3 top-3 text-[16px] text-dc-line transition-colors group-hover:text-dc-gold"
        >
          arrow_outward
        </span>
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}

export function EmptyState({ icon = "inbox", title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-dc-line bg-dc-paper px-6 py-12 text-center">
      <span className="material-symbols-outlined text-[32px] text-dc-ink-2">{icon}</span>
      <p className="font-dc-display text-[15px] font-bold text-dc-ink">{title}</p>
      {hint ? <p className="max-w-[46ch] text-body-md text-dc-ink-2">{hint}</p> : null}
    </div>
  );
}

const TONES = [
  "from-[#2f6b45] to-[#7fae8c]",
  "from-[#1f5f8b] to-[#79a7c4]",
  "from-[#8c3a52] to-[#c58a9a]",
  "from-[#987c4b] to-[#d9c39a]",
  "from-[#3d3a54] to-[#8a86a8]",
  "from-[#6b4a86] to-[#b195c9]",
];

/** Ô ảnh/video. Chưa gắn link thật -> hiện nền chuyển sắc + chú thích (xem README hub). */
export function MediaTile({ item, className = "" }) {
  const tone = TONES[((item.tone || 1) - 1) % TONES.length];
  return (
    <figure className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border border-dc-line ${className}`}>
      {item.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.caption || ""} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={`h-full w-full bg-gradient-to-br ${tone}`} aria-hidden="true" />
      )}
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
        <span className="material-symbols-outlined text-[14px] leading-none">
          {item.type === "video" ? "play_circle" : "photo_camera"}
        </span>
        {item.type === "video" ? "Video" : "Ảnh"}
      </span>
      {/* Ảnh không khai chú thích thì bỏ hẳn dải chữ — để trống thì chỉ còn vệt tối vô nghĩa. */}
      {item.caption ? (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-[13px] font-medium leading-snug text-white">
          {item.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
