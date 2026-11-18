"use client";

import { useEffect, useState } from "react";

/* Băng chuyền ảnh của một mùa: tấm đang xem nằm giữa và to nhất, hai tấm kề ló ra hai bên
   nhỏ hơn và mờ hơn, tự trôi sang tấm kế tiếp.
   Chỉ dựng ba tấm quanh tấm đang xem — album 16 ảnh mà nạp hết một lượt là ~2MB.
   Rê chuột vào thì dừng, và máy nào xin giảm chuyển động thì không tự chạy nữa. */

const GAP = 78; // tâm ảnh hai bên cách tâm ảnh giữa bao nhiêu phần trăm bề ngang một tấm
const SIDE = 0.8; // ảnh hai bên thu còn bấy nhiêu

export default function PhotoSlider({ items, interval = 4500, className = "" }) {
  const n = items.length;
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (n < 2 || hold) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), interval);
    return () => clearInterval(id);
  }, [n, hold, interval]);

  if (n === 0) return null;

  // Khoảng cách vòng tròn tới tấm đang xem: 0 là tấm giữa, ±1 là hai tấm kề, xa hơn thì không dựng.
  const offsetOf = (k) => {
    const d = (k - i + n) % n;
    return d === 0 ? 0 : d === 1 ? 1 : d === n - 1 ? -1 : null;
  };

  return (
    <div className={className}>
      <div
        className="relative h-[200px] overflow-hidden sm:h-[280px] lg:h-[340px]"
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
      >
        {items.map((m, k) => {
          const off = n === 1 ? 0 : offsetOf(k);
          if (off === null) return null;
          const mid = off === 0;
          return (
            <button
              key={m.id}
              type="button"
              tabIndex={mid ? -1 : 0}
              aria-label={mid ? undefined : off === 1 ? "Ảnh sau" : "Ảnh trước"}
              aria-hidden={mid ? "true" : undefined}
              onClick={() => (mid ? null : setI(k))}
              style={{
                transform: `translateX(calc(-50% + ${off * GAP}%)) scale(${mid ? 1 : SIDE})`,
                zIndex: mid ? 10 : 0,
              }}
              className={`absolute left-1/2 top-0 aspect-[4/3] h-full overflow-hidden rounded-2xl border border-dc-line transition-[transform,opacity] duration-700 ease-out ${
                mid ? "cursor-default opacity-100" : "cursor-pointer opacity-55 hover:opacity-80"
              }`}
            >
              {/* Nền mờ lấp phần thừa: ảnh 3:2 bỏ trong khung 4:3 thì hở trên dưới. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt=""
                aria-hidden="true"
                loading={k === 0 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </button>
          );
        })}
      </div>

      {n > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((m, k) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Ảnh ${k + 1}`}
              aria-current={k === i ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all ${
                k === i ? "w-6 bg-dc-ink" : "w-1.5 bg-dc-line hover:bg-dc-ink-2"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
