"use client";

import { useState } from "react";
import { MediaTile } from "./ui";

/* Album của một giải nhiều mùa: ảnh gom về một chỗ, hàng pill chọn mùa đổi lưới ngay tại trang
   thay vì phải nhảy sang trang mùa khác. Chỉ liệt kê mùa thật sự có ảnh — pill rỗng thì bấm vào
   chỉ thấy khoảng trống. Mùa đang xem mà chưa góp ảnh thì mở mùa gần nhất có ảnh và nói rõ. */

export default function SeasonAlbum({ albums, current }) {
  const here = albums.find((a) => a.slug === current);
  const [slug, setSlug] = useState((here || albums[0]).slug);
  const album = albums.find((a) => a.slug === slug) || albums[0];
  const many = albums.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {many ? (
          <>
            <span className="mr-0.5 font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-ink-2">
              Mùa
            </span>
            {albums.map((a) => {
              const on = a.slug === album.slug;
              return (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => setSlug(a.slug)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 font-dc-display text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums transition-colors ${
                    on
                      ? "border-dc-ink bg-dc-ink text-white"
                      : "border-dc-line bg-white text-dc-ink-2 hover:border-dc-gold hover:text-dc-gold"
                  }`}
                >
                  {a.season}
                  <span className={`ml-1.5 ${on ? "text-white/60" : "text-dc-ink-2/70"}`}>{a.items.length}</span>
                </button>
              );
            })}
          </>
        ) : null}

        <span className="ml-auto text-[13px] text-dc-ink-2 tabular-nums">
          {here ? null : `Mùa này chưa có ảnh · đang xem `}
          {album.items.length} ảnh mùa {album.season}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {album.items.map((m) => (
          <MediaTile key={m.id} item={m} />
        ))}
      </div>
    </div>
  );
}
