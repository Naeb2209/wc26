import Link from "next/link";
import { coverOf, fmtDate, memberName, posts } from "@/lib/dc42";
import { EmptyState, PageHeader, Section } from "@/components/hub/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bảng tin | DC42 Hub",
  description: "Thông báo, recap và điều lệ của DC — thay cho việc mọi thứ trôi trong chat.",
};

/* Dựng theo trang News của EWC: ô tìm kiếm kính trắng, lưới thẻ 4 cột (ảnh trên, nhãn vàng
   đè mép ảnh, tiêu đề in hoa đậm, tóm tắt xám 3 dòng) và phân trang ô vuông, trang đang xem tô vàng. */

const PAGE_SIZE = 12;
const KIND_ICON = { "Thông báo": "campaign", Recap: "sports_score", "Điều lệ": "gavel" };

// Tìm không dấu: gõ "cau long" vẫn ra "cầu lông".
const fold = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

function hrefFor({ kind, q, page }) {
  const sp = new URLSearchParams();
  if (kind && kind !== "all") sp.set("loai", kind);
  if (q) sp.set("q", q);
  if (page && page > 1) sp.set("trang", String(page));
  const qs = sp.toString();
  return qs ? `/bang-tin?${qs}` : "/bang-tin";
}

export default async function NewsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const kind = sp.loai || "all";
  const q = String(sp.q || "").trim();
  const all = posts();
  const kinds = [...new Set(all.map((p) => p.kind))];

  const needle = fold(q);
  const list = all
    .filter((p) => kind === "all" || p.kind === kind)
    .filter((p) => !needle || fold(`${p.title} ${p.excerpt} ${p.body}`).includes(needle));

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(sp.trang, 10) || 1));
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader
        hero
        eyebrow="Bảng tin"
        title="Thông báo & recap"
        lede="Việc gì cần mọi người biết thì nằm ở đây, không trôi mất sau vài trăm tin nhắn."
      />

      <div className="bg-[#f5f5f5]">
        <Section>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Form GET thường: không cần JS, link tìm kiếm gửi cho nhau được. */}
            <form action="/bang-tin" role="search" className="w-full lg:max-w-[560px]">
              {kind !== "all" ? <input type="hidden" name="loai" value={kind} /> : null}
              <label className="flex w-full items-center justify-between gap-2 rounded-[15px] bg-white py-[11px] pe-3 ps-6 shadow-[4px_8px_16px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-dc-gold/50">
                <span className="sr-only">Tìm trong bảng tin</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Tìm bài…"
                  className="min-w-0 grow bg-transparent text-[15px] text-dc-ink outline-none placeholder:font-dc-display placeholder:font-bold placeholder:text-[#c9c9c9]"
                />
                <button
                  type="submit"
                  aria-label="Tìm"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-dc-ink transition-colors hover:bg-dc-bone"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>
              </label>
            </form>

            <nav aria-label="Lọc theo loại bài" className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
              <div className="flex w-max gap-0.5 rounded-full bg-white p-1 shadow-[4px_8px_16px_rgba(0,0,0,0.06)]">
                <KindLink label="Tất cả" href={hrefFor({ q })} active={kind === "all"} />
                {kinds.map((k) => (
                  <KindLink key={k} label={k} href={hrefFor({ kind: k, q })} active={kind === k} />
                ))}
              </div>
            </nav>
          </div>

          {q ? (
            <p className="-mt-3 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-dc-ink-2">
              <span>
                {list.length} bài khớp “<span className="font-bold text-dc-ink">{q}</span>”
              </span>
              <Link
                href={hrefFor({ kind })}
                className="font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-gold hover:text-dc-gold-deep"
              >
                Xoá tìm kiếm
              </Link>
            </p>
          ) : null}

          {shown.length === 0 ? (
            <EmptyState icon="search_off" title="Không có bài nào khớp" hint="Thử từ khoá khác, hoặc bỏ bộ lọc loại bài." />
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {shown.map((p) => (
                <NewsCard key={p.slug} post={p} />
              ))}
            </div>
          )}

          {pages > 1 ? <Pager page={page} pages={pages} make={(n) => hrefFor({ kind, q, page: n })} /> : null}
        </Section>
      </div>
    </>
  );
}

function NewsCard({ post: p }) {
  const cover = p.activity ? coverOf(p.activity) : null;
  return (
    <Link
      href={`/bang-tin/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_12px_24px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_18px_36px_rgba(0,0,0,0.1)]"
    >
      <div className="relative aspect-video overflow-hidden bg-dc-ink">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <NewsArt kind={p.kind} />
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-2 px-5 pb-5 pt-6">
        {/* Nhãn đè lên mép ảnh như thẻ tin của EWC */}
        <div className="absolute -top-3 start-5 flex gap-1.5">
          <span className="rounded-[4px] bg-[#be9e59] px-[6px] py-[3px] font-dc-display text-[11px] font-bold uppercase leading-[1.2] tracking-[0.12em] text-white">
            {p.kind}
          </span>
          {p.pinned ? (
            <span className="inline-flex items-center gap-0.5 rounded-[4px] bg-dc-ink px-[6px] py-[3px] font-dc-display text-[11px] font-bold uppercase leading-[1.2] tracking-[0.12em] text-white">
              <span className="material-symbols-outlined text-[12px] leading-none">push_pin</span>
              Ghim
            </span>
          ) : null}
        </div>

        <p className="line-clamp-2 font-dc-display text-[16px] font-bold uppercase leading-[1.3] tracking-[0.04em] text-dc-ink">
          {p.title}
        </p>
        <p className="line-clamp-3 text-[14px] font-medium leading-[1.4] text-[#858585]">{p.excerpt}</p>
        <p className="mt-auto pt-2 font-dc-display text-[10.5px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
          {fmtDate(p.date)} · {memberName(p.author)}
        </p>
      </div>
    </Link>
  );
}

/* Bài không gắn album nào: ô mực ánh vàng + icon loại bài, cùng chất với hero. */
function NewsArt({ kind }) {
  return (
    <div className="absolute inset-0 isolate grid place-items-center overflow-hidden bg-[#151515] transition-transform duration-300 group-hover:scale-110">
      <span className="ewc-hero__glow" aria-hidden="true" />
      <span className="material-symbols-outlined text-[56px] text-dc-gold-soft/90">{KIND_ICON[kind] || "article"}</span>
      <span className="absolute bottom-3 end-4 font-dc-display text-[13px] font-bold italic tracking-tight text-white/45">
        DC<span className="text-dc-gold">42</span>
      </span>
    </div>
  );
}

function KindLink({ label, href, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full px-4 py-2 font-dc-display text-[11.5px] font-bold uppercase tracking-[0.1em] transition-colors ${
        active ? "bg-dc-ink text-white" : "text-dc-ink-2 hover:text-dc-ink"
      }`}
    >
      {label}
    </Link>
  );
}

/* Phân trang kiểu EWC: ô 38px bo 8px, đổ bóng nhẹ; trang đang xem nền vàng chữ trắng. */
function Pager({ page, pages, make }) {
  const nums = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const box =
    "grid size-[38px] place-items-center rounded-lg font-dc-display text-[14px] font-bold shadow-[4px_8px_16px_rgba(0,0,0,0.08)]";
  return (
    <nav aria-label="Phân trang" className="mt-10 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={make(page - 1)} aria-label="Trang trước" className={`${box} bg-white text-dc-ink`}>
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </Link>
      ) : null}
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-dc-ink-2">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={make(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${box} ${n === page ? "bg-[#aea16f] text-white" : "bg-white text-dc-ink hover:text-dc-gold"}`}
          >
            {n}
          </Link>
        )
      )}
      {page < pages ? (
        <Link href={make(page + 1)} aria-label="Trang sau" className={`${box} bg-white text-dc-ink`}>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </Link>
      ) : null}
    </nav>
  );
}
