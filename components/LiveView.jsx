"use client";

import { useEffect, useState } from "react";
import { flagUrl } from "@/lib/flags";

function Stat({ label, children }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
      <div className="font-data-mono text-data-mono text-on-surface-variant mb-1">{label}</div>
      {children}
    </div>
  );
}

function ChannelList({ channels, activeChannel }) {
  return (
    <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
      <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm h-full flex flex-col">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Chọn Kênh Phát Sóng</h3>
        <div className="flex flex-col gap-3 overflow-y-auto flex-grow pr-2">
          {channels.map((ch) => {
            const active = ch.code === activeChannel;
            return (
              <div
                key={ch.code}
                className={
                  active
                    ? "flex items-center p-3 rounded-lg border-2 border-secondary-container bg-surface-container-low cursor-pointer shadow-[0px_8px_24px_rgba(29,78,216,0.12)] relative overflow-hidden group"
                    : "flex items-center p-3 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-low cursor-pointer transition-colors group"
                }
              >
                {active && <div className="live-spotlight absolute inset-0 opacity-50" />}
                <div className="relative z-10 flex w-full items-center gap-4">
                  <div
                    className={`w-16 h-16 bg-white rounded flex items-center justify-center font-display-lg text-[18px] border border-outline-variant shrink-0 ${
                      active ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {ch.label}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className={`font-bold text-on-surface ${active ? "" : "group-hover:text-primary transition-colors"}`}>
                      {ch.name}
                    </div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant text-sm truncate">{ch.program}</div>
                  </div>
                  {active && (
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps px-2 py-1 rounded animate-pulse shrink-0">
                      ĐANG PHÁT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LiveView({ initialLive, initialChannels }) {
  const [live, setLive] = useState(initialLive);
  const [channels, setChannels] = useState(initialChannels);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setLive(data.live);
        setChannels(data.channels);
        setUpdatedAt(new Date());
      } catch (e) {
        /* giữ dữ liệu cũ nếu lỗi mạng */
      }
    };
    const id = setInterval(tick, 10000); // polling mỗi 10 giây
    tick();
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Không có trận đang diễn ra
  if (!live) {
    return (
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
          <div className="bg-surface border border-outline-variant rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[320px]">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">sports_soccer</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Hiện không có trận nào trực tiếp</h2>
            <p className="font-body-md text-on-surface-variant max-w-md">
              Khi có trận World Cup 2026 đang diễn ra, tỉ số và diễn biến sẽ tự động hiển thị tại đây (cập nhật mỗi 10 giây).
            </p>
            {updatedAt && (
              <span className="mt-4 font-label-caps text-label-caps text-on-surface-variant">
                Kiểm tra lúc {updatedAt.toLocaleTimeString("vi-VN")}
              </span>
            )}
          </div>
        </div>
        <ChannelList channels={channels} activeChannel={null} />
      </main>
    );
  }

  const possession = live.stats?.possession;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 md:grid-cols-12 gap-gutter">
      <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
        {/* Video player (placeholder) */}
        <div className="relative w-full rounded-xl overflow-hidden video-container shadow-[0px_8px_24px_rgba(29,78,216,0.12)] border border-outline-variant">
          <img
            alt="Trực tiếp trận đấu"
            className="absolute inset-0 w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDZ4QXToqida861a6ljWUXhuwUp4rSrkax7VSBGoD3qsMADN7Ek3O0mHCrWU518ObYCz0f_bsf3qo9dFHUL2qzJMWJZJKnd-bgHM2sqaLDkBKjji4XRAQZS2zQehvJLjYE2YbIuriSYRaGe3IdAUT1DBkRAra4MYtF-oVPj46Nh98gCpW1plTg83CIjQP19wDXgmZCjXJ74rYOMNdAACQqnF9sPhsQ43dEEF0l66dEDQ6Y1-mzNbuGLzTv3WRYmP5bLyQQ_XgmiLyQ"
          />
          <div className="absolute bottom-0 inset-x-0 glass-panel p-4 flex items-center justify-between text-on-secondary">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined">play_arrow</span>
              <span className="material-symbols-outlined">volume_up</span>
              <span className="font-data-mono text-data-mono">{live.clock}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps px-2 py-1 rounded animate-pulse">
                TRỰC TIẾP
              </span>
              <span className="material-symbols-outlined">settings</span>
              <span className="material-symbols-outlined">fullscreen</span>
            </div>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <img src={live.homeFlag || flagUrl(live.homeIso, 160)} alt={live.homeCode} className="w-16 h-12 rounded shadow-sm object-contain bg-white border border-outline-variant mx-auto" />
              <div className="font-headline-md text-headline-md mt-2">{live.homeCode}</div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="font-data-mono text-data-mono text-on-surface-variant">{live.group}</div>
              <div className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary my-2">
                {live.homeScore} - {live.awayScore}
              </div>
              <div className="font-data-mono text-data-mono text-secondary">{live.minute}</div>
            </div>
            <div className="text-center">
              <img src={live.awayFlag || flagUrl(live.awayIso, 160)} alt={live.awayCode} className="w-16 h-12 rounded shadow-sm object-contain bg-white border border-outline-variant mx-auto" />
              <div className="font-headline-md text-headline-md mt-2">{live.awayCode}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-transparent border-2 border-secondary-container text-secondary font-label-caps text-label-caps px-4 py-2 rounded hover:bg-secondary-container hover:text-on-secondary-container transition-all">
              Chi Tiết
            </button>
            <button className="bg-transparent border-2 border-secondary-container text-secondary font-label-caps text-label-caps px-4 py-2 rounded hover:bg-secondary-container hover:text-on-secondary-container transition-all">
              Đội Hình
            </button>
          </div>
        </div>

        {/* Live stats (chỉ hiện nếu API có cung cấp) */}
        {live.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {possession && (
              <Stat label="Kiểm Soát Bóng">
                <div className="w-full flex items-center justify-between mt-2">
                  <span className="font-headline-md text-headline-md text-primary">{possession[0]}%</span>
                  <span className="font-headline-md text-headline-md text-on-surface-variant">{possession[1]}%</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full mt-2 overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: `${possession[0]}%` }} />
                  <div className="h-full bg-outline" style={{ width: `${possession[1]}%` }} />
                </div>
              </Stat>
            )}
            {live.stats.shots && (
              <Stat label="Cú Sút">
                <div className="font-headline-md text-headline-md text-on-surface">{live.stats.shots}</div>
              </Stat>
            )}
            {live.stats.corners && (
              <Stat label="Phạt Góc">
                <div className="font-headline-md text-headline-md text-on-surface">{live.stats.corners}</div>
              </Stat>
            )}
            {live.stats.fouls && (
              <Stat label="Phạm Lỗi">
                <div className="font-headline-md text-headline-md text-on-surface">{live.stats.fouls}</div>
              </Stat>
            )}
          </div>
        )}

        {/* Commentary (chỉ hiện nếu có) */}
        {live.commentary?.length > 0 && (
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-2">
              <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Bình Luận Trực Tiếp</h3>
              {updatedAt && (
                <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim inline-block animate-pulse" />
                  Cập nhật {updatedAt.toLocaleTimeString("vi-VN")}
                </span>
              )}
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {live.commentary.map((c, i) => (
                <div
                  key={i}
                  className={`flex gap-4 items-start border-l-2 pl-4 ${
                    c.highlight ? "border-primary" : "border-outline-variant opacity-80"
                  }`}
                >
                  <div className={`font-data-mono text-data-mono mt-1 ${c.highlight ? "text-secondary" : "text-on-surface-variant"}`}>
                    {c.minute}
                  </div>
                  <div>
                    <div className="font-bold text-on-surface">{c.title}</div>
                    {c.text && <p className="text-on-surface-variant mt-1">{c.text}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Khi API chỉ có tỉ số, không có thống kê chi tiết */}
        {!live.stats && (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Tỉ số cập nhật tự động từ API. Thống kê & bình luận chi tiết không có trong gói dữ liệu hiện tại.
          </div>
        )}
      </div>

      <ChannelList channels={channels} activeChannel={live.activeChannel} />
    </main>
  );
}
