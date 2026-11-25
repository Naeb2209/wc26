"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/* Dải Moments cuộn ngang ở trang chủ.

   Không phải lưới ô đều nhau: các cột xen kẽ dọc / ngang / cột đôi nên mắt chạy theo
   dải thay vì quét từng hàng. Mỗi ô là một tấm ảnh phủ kín, người đăng và hoạt động
   nằm trên dải tối ở đáy — ảnh to hơn thì có thêm chú thích.

   Cuộn bằng vuốt, bằng hai nút mũi tên hoặc bằng phím khi focus vào dải; thanh tiến độ
   bên dưới cho biết đang ở đâu vì dải dài hơn màn hình. */

// Nền dự phòng cho mục chưa có file ảnh — cùng bộ màu với MediaTile để hai nơi không lệch tông.
const TONES = [
  "from-dc-gold/70 to-dc-ink",
  "from-dc-pitch/70 to-dc-ink",
  "from-dc-court/70 to-dc-ink",
  "from-dc-social/70 to-dc-ink",
  "from-dc-fantasy/70 to-dc-ink",
  "from-dc-gold-deep/70 to-dc-ink",
];

// Clip = mục video đã có file thật; video chỉ khai trong data mà chưa tải lên thì vẫn
// rơi về ô gradient có nút play.
const isClip = (item) => item?.type === "video" && !!item.url;

// Nhịp cột: dọc → ngang → cột đôi, lặp lại. Cột đôi cần hai mục, thiếu thì lùi về dọc.
const RHYTHM = ["tall", "wide", "split"];

function columnsOf(items) {
  const rest = [...items];
  // Ô ngang là ô to nhất dải nên ưu tiên dành cho clip — video nhét vào ô nhỏ thì vừa
  // khó xem vừa phí. Hết clip thì lấy theo thứ tự như thường.
  const take = (preferClip) => {
    if (preferClip) {
      const i = rest.findIndex(isClip);
      if (i >= 0) return rest.splice(i, 1)[0];
    }
    return rest.shift();
  };

  const out = [];
  while (rest.length > 0) {
    const kind = RHYTHM[out.length % RHYTHM.length];
    if (kind === "split" && rest.length >= 2) {
      out.push({ kind, items: [take(false), take(false)] });
    } else {
      const single = kind === "split" ? "tall" : kind;
      out.push({ kind: single, items: [take(single === "wide")] });
    }
  }
  return out;
}

/* Mép trái của từng cột tính theo toạ độ cuộn của dải.

   Không dùng offsetLeft: cột nằm trong khối bọc có lề hai bên nên offsetLeft đếm cả lề,
   lệch đúng bằng chừng đó pixel so với scrollLeft. */
function colEdges(rail, cols) {
  const base = rail.getBoundingClientRect().left - rail.scrollLeft;
  return cols.filter(Boolean).map((col) => Math.round(col.getBoundingClientRect().left - base));
}

/* Bề ngang cột tính theo phần trăm khung, không phải số pixel cố định: ba cột của một
   nhịp (dọc + ngang + cột đôi) cộng lại vừa đúng bề ngang dải, nên lúc nào cũng thấy
   trọn ba tấm, không có tấm thứ tư ló ra một nửa.
   0.30 + 0.44 + 0.26 = 1, trừ đi hai khoảng hở 12px giữa các cột.
   Màn hẹp thì mỗi cột chiếm trọn khung — ba cột nhét vào 375px thì tấm nào cũng bé xíu. */
const WIDTH = {
  tall: "w-full md:w-[calc((100%-24px)*0.30)]",
  wide: "w-full md:w-[calc((100%-24px)*0.44)]",
  split: "w-full md:w-[calc((100%-24px)*0.26)]",
};

// Số cột thấy cùng lúc, dùng để mũi tên nhảy trọn một trang.
const PER_PAGE = () => (typeof window !== "undefined" && window.innerWidth >= 768 ? RHYTHM.length : 1);

export default function MomentsRail({ items = [] }) {
  const railRef = useRef(null);
  const colRefs = useRef([]);
  const [pos, setPos] = useState({ ratio: 0, active: 0, scrollable: false, widths: [] });
  // null = chưa mở ảnh nào. Giữ chỉ số trong mảng phẳng để hai nút chuyển ảnh chạy suốt dải.
  const [open, setOpen] = useState(null);
  const step = useCallback(
    (dir) => setOpen((cur) => (cur === null ? cur : (cur + dir + items.length) % items.length)),
    [items.length]
  );

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;

    // Đoạn đang sáng là cột có tâm gần tâm khung nhìn nhất — cuộn tay hay bấm mũi tên
    // đều ra cùng một kết quả, không phải đoán theo tỉ lệ.
    const center = el.scrollLeft + el.clientWidth / 2;
    const edges = colEdges(el, colRefs.current);
    let active = 0;
    let best = Infinity;
    colRefs.current.filter(Boolean).forEach((col, i) => {
      const d = Math.abs(edges[i] + col.offsetWidth / 2 - center);
      if (d < best) {
        best = d;
        active = i;
      }
    });

    setPos({
      ratio: max > 0 ? el.scrollLeft / max : 0,
      active,
      scrollable: max > 8,
      widths: colRefs.current.map((col) => col?.offsetWidth || 1),
    });
  }, []);

  useEffect(() => {
    measure();
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  if (items.length === 0) return null;

  const cols = columnsOf(items);

  // Mũi tên nhảy trọn một trang: cuộn tới mép của cột đầu trang kế tiếp, nên sau mỗi lần
  // bấm là đúng ba tấm mới, không tấm nào bị cắt.
  const nudge = (dir) => {
    const el = railRef.current;
    if (!el) return;
    const edges = colEdges(el, colRefs.current);
    const here = edges.findIndex((x) => Math.abs(x - el.scrollLeft) < 8);
    const from = here >= 0 ? here : edges.filter((x) => x <= el.scrollLeft + 8).length - 1;
    const next = Math.min(Math.max(from + dir * PER_PAGE(), 0), edges.length - 1);
    el.scrollTo({ left: edges[next] ?? 0, behavior: "smooth" });
  };

  return (
    // Hai mũi tên nằm trong lề chừa sẵn hai bên: dải ảnh thu vào chứ nút không thò ra
    // ngoài khung trang, nên mọi bề rộng màn hình đều thấy đủ cả hai nút.
    <div className="relative md:px-16">
      <div
        ref={railRef}
        onScroll={measure}
        tabIndex={0}
        aria-label="Moments gần nhất"
        className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dc-gold"
      >
        {cols.map((col, i) => (
          <div
            key={col.items.map((m) => m.id).join("-")}
            ref={(el) => {
              colRefs.current[i] = el;
            }}
            // Chỉ cột mở đầu mỗi trang mới là điểm dừng: cuộn tay cũng về đúng mép trang,
            // không dừng giữa chừng làm cột cuối bị cắt.
            className={`flex h-[380px] shrink-0 flex-col gap-3 md:h-[520px] ${WIDTH[col.kind]} ${
              i % RHYTHM.length === 0 ? "snap-start" : ""
            }`}
          >
            {col.items.map((m) => (
              <MomentTile
                key={m.id}
                item={m}
                big={col.kind === "wide"}
                compact={col.kind === "split"}
                onOpen={() => setOpen(items.indexOf(m))}
                hold={open !== null}
              />
            ))}
          </div>
        ))}
      </div>

      {pos.scrollable ? (
        <>
          <Arrow dir={-1} onClick={() => nudge(-1)} disabled={pos.ratio <= 0.01} />
          <Arrow dir={1} onClick={() => nudge(1)} disabled={pos.ratio >= 0.99} />

          {/* Thanh tiến độ chia đoạn theo cột: đoạn của cột đang xem sáng vàng, mỗi đoạn
              rộng đúng bằng cột của nó nên vạch sáng nằm thẳng dưới ảnh đang xem. */}
          <div className="mt-4 flex w-full gap-1">
            {cols.map((col, i) => (
              <span
                key={col.items.map((m) => m.id).join("-")}
                style={{ flexGrow: pos.widths?.[i] || 1, flexBasis: 0 }}
                className={`h-[3px] rounded-full transition-colors duration-200 ${
                  i === pos.active ? "bg-dc-gold" : "bg-dc-line"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}

      {open !== null ? (
        <Lightbox items={items} index={open} onClose={() => setOpen(null)} onStep={step} />
      ) : null}
    </div>
  );
}

function Arrow({ dir, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? "Xem ảnh trước đó" : "Xem ảnh tiếp theo"}
      className={`absolute top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-dc-ink/55 text-white backdrop-blur transition hover:bg-dc-ink/80 disabled:pointer-events-none disabled:opacity-35 md:grid ${
        dir < 0 ? "left-1" : "right-1"
      }`}
    >
      <span className="material-symbols-outlined text-[22px]">{dir < 0 ? "arrow_back" : "arrow_forward"}</span>
    </button>
  );
}

function MomentTile({ item, big = false, compact = false, onOpen, hold = false }) {
  const tone = TONES[((item.tone || 1) - 1) % TONES.length];
  const clipRef = useRef(null);
  // `hold`: đang mở lightbox — ô nằm sau lớp phủ, chạy tiếp chỉ tốn pin.
  const holdRef = useRef(hold);
  const syncRef = useRef(() => {});

  // Clip tự chạy câm và lặp lại, như một ảnh động — ô video đứng im giữa dải ảnh nhìn
  // như hỏng. Trình duyệt chỉ cho tự chạy khi video đang câm, mà React 18 không phải lúc
  // nào cũng gắn `muted` vào thẻ lúc hydrate — nên ép câm bằng tay trước khi play().
  //
  // Chỉ tải và chạy khi ô sắp vào khung nhìn: dải Moments nằm dưới màn hình đầu, tải sẵn
  // clip vài MB lúc mở trang là tốn 4G và giành băng thông của phần trên. Khuất đi (cuộn
  // qua, lướt dải sang chỗ khác, tab ẩn, mở lightbox) thì dừng cho đỡ pin.
  //
  // Trình duyệt vẫn có lúc chặn play() (điện thoại tiết kiệm pin…), nên thử lại khi video
  // sẵn sàng, khi tab hiện lại, và ở lần chạm / bấm đầu tiên trên trang.
  useEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    el.muted = true;
    el.defaultMuted = true;

    // Trình duyệt quá cũ không có IntersectionObserver thì coi như luôn thấy — như trước.
    let seen = typeof IntersectionObserver === "undefined";
    const sync = () => {
      if (seen && !document.hidden && !holdRef.current) {
        if (el.paused) el.play().catch(() => {});
      } else if (!el.paused) {
        el.pause();
      }
    };
    syncRef.current = sync;

    let io;
    if (!seen) {
      io = new IntersectionObserver(
        ([entry]) => {
          seen = entry.isIntersecting;
          // Chạm tới mép khung (cộng lề 200px) mới bắt đầu tải, để cuộn tới là có hình.
          if (seen && el.preload !== "auto") el.preload = "auto";
          sync();
        },
        { rootMargin: "200px" }
      );
      io.observe(el);
    } else {
      el.preload = "auto";
      sync();
    }

    const kick = { once: true, passive: true };
    el.addEventListener("loadeddata", sync);
    el.addEventListener("canplay", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointerdown", sync, kick);
    window.addEventListener("touchstart", sync, kick);
    return () => {
      io?.disconnect();
      el.removeEventListener("loadeddata", sync);
      el.removeEventListener("canplay", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointerdown", sync);
      window.removeEventListener("touchstart", sync);
    };
  }, []);

  useEffect(() => {
    holdRef.current = hold;
    syncRef.current();
  }, [hold]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={item.caption || `Xem ảnh · ${item.activity}`}
      className="group relative flex-1 overflow-hidden rounded-2xl border border-dc-line bg-dc-ink text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
    >
      {isClip(item) ? (
        /* Video có file thì chính nó là ảnh bìa, khỏi phải xuất thêm thumbnail cho mỗi clip. */
        <video
          ref={clipRef}
          src={item.url}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          style={{ objectPosition: item.focus || undefined }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : item.url ? (
        /* `focus` quyết định giữ phần nào của ảnh khi cắt cho vừa ô — ảnh ngang nhét vào
           ô dọc mất gần nửa bề ngang, mặc định cắt đều hai bên nên nhân vật chính hay bị
           xén. Khai "left" / "25% 50%"… trong data là chọn lại phần muốn giữ. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.caption || ""}
          loading="lazy"
          style={{ objectPosition: item.focus || undefined }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${tone}`} aria-hidden="true" />
      )}

      {/* Dải tối chỉ ở đáy: giữ ảnh sáng nguyên phần trên, chữ vẫn đọc được. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <span className="absolute left-3 top-3 grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
        <span className="material-symbols-outlined text-[16px] leading-none">
          {item.type === "video" ? "play_arrow" : "photo_camera"}
        </span>
      </span>

      {/* Nút play lớn chỉ dành cho clip chưa có file: clip đang chạy sẵn thì nút này
          vô nghĩa, lại che mất đúng giữa khung hình. */}
      {item.type === "video" && !isClip(item) && !compact ? (
        <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition group-hover:bg-white/35">
          <span className="material-symbols-outlined text-[30px] leading-none">play_arrow</span>
        </span>
      ) : null}

      {/* Trên là tiêu đề của tấm ảnh, dưới là hoạt động nó thuộc về. Ảnh chưa đặt tiêu đề
          thì tên hoạt động lên làm dòng chính, không để dòng trên trống hoác. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col p-3.5 md:p-4">
        <p
          className={`font-dc-display font-bold leading-tight text-white ${
            big ? "line-clamp-2 text-[17px]" : "truncate text-[14px]"
          }`}
        >
          {item.caption || item.activity}
        </p>
        {item.caption ? (
          <p className="mt-0.5 truncate text-[12px] leading-tight text-white/70">{item.activity}</p>
        ) : null}
      </div>
    </button>
  );
}

/* Lớp xem ảnh: bấm vào ô là ảnh phóng to ngay tại trang, không đẩy ai rời trang chủ.
   Đóng bằng nút X, phím Esc hoặc bấm ra nền; chuyển ảnh bằng hai nút hoặc phím mũi tên.
   Link tới album vẫn còn, nhưng là một dòng nhỏ ở chân — ai muốn xem cả buổi thì bấm. */
function Lightbox({ items, index, onClose, onStep }) {
  const item = items[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    document.addEventListener("keydown", onKey);
    // Khoá cuộn nền: ảnh đang mở mà trang chạy sau lưng thì lúc đóng không biết mình ở đâu.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onStep]);

  if (!item) return null;
  const tone = TONES[((item.tone || 1) - 1) % TONES.length];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.caption || "Ảnh của DC"}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm md:p-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-6 md:top-6"
      >
        <span className="material-symbols-outlined text-[22px]">close</span>
      </button>

      {items.length > 1 ? (
        <>
          <LightboxStep dir={-1} onClick={() => onStep(-1)} />
          <LightboxStep dir={1} onClick={() => onStep(1)} />
        </>
      ) : null}

      {/* Chặn nổi bọt: bấm vào chính tấm ảnh thì không tính là bấm ra nền. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-4xl flex-col items-center gap-4"
      >
        {isClip(item) ? (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-[70vh] w-auto max-w-full rounded-2xl bg-black"
          />
        ) : item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.caption || ""}
            className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain"
          />
        ) : (
          <div
            className={`grid aspect-[4/3] w-full max-w-xl place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white/80`}
          >
            <span className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[44px]">
                {item.type === "video" ? "movie" : "photo_library"}
              </span>
              <span className="text-[13px]">{item.type === "video" ? "Video chưa tải lên" : "Chưa có file ảnh"}</span>
            </span>
          </div>
        )}

        <figcaption className="w-full max-w-2xl text-center text-white">
          {item.caption ? <p className="text-[15px] leading-snug">{item.caption}</p> : null}
          <p className="mt-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
            {item.by ? `${item.by} · ` : ""}
            {item.activity}
          </p>
          <Link
            href={item.href}
            className="mt-3 inline-flex items-center gap-1 font-dc-display text-[11px] font-bold uppercase tracking-[0.14em] text-dc-gold hover:text-white"
          >
            Xem cả album
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </figcaption>
      </figure>
    </div>
  );
}

function LightboxStep({ dir, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={dir < 0 ? "Ảnh trước" : "Ảnh sau"}
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 ${
        dir < 0 ? "left-2 md:left-6" : "right-2 md:right-6"
      }`}
    >
      <span className="material-symbols-outlined text-[24px]">{dir < 0 ? "chevron_left" : "chevron_right"}</span>
    </button>
  );
}
