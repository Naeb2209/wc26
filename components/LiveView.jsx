"use client";

import { useEffect, useState } from "react";
import { flagUrl } from "@/lib/flags";

const POSTER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBDZ4QXToqida861a6ljWUXhuwUp4rSrkax7VSBGoD3qsMADN7Ek3O0mHCrWU518ObYCz0f_bsf3qo9dFHUL2qzJMWJZJKnd-bgHM2sqaLDkBKjji4XRAQZS2zQehvJLjYE2YbIuriSYRaGe3IdAUT1DBkRAra4MYtF-oVPj46Nh98gCpW1plTg83CIjQP19wDXgmZCjXJ74rYOMNdAACQqnF9sPhsQ43dEEF0l66dEDQ6Y1-mzNbuGLzTv3WRYmP5bLyQQ_XgmiLyQ";

function Stat({ label, children }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
      <div className="font-data-mono text-data-mono text-on-surface-variant mb-1">{label}</div>
      {children}
    </div>
  );
}

// Logo kênh: hiện ảnh nếu có, lỗi/không có thì fallback về chữ (mã kênh)
function LogoBox({ channel, sizeClass, textClass }) {
  const [err, setErr] = useState(false);
  const show = channel?.logo && !err;
  return (
    <div className={`${sizeClass} bg-white rounded flex items-center justify-center border border-outline-variant shrink-0 overflow-hidden p-1.5`}>
      {show ? (
        <img
          src={channel.logo}
          alt={channel.name}
          onError={() => setErr(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className={`font-display-lg text-primary ${textClass}`}>{channel?.label}</span>
      )}
    </div>
  );
}

function ChannelList({ channels, activeCode, onSelect }) {
  return (
    <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
      <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm h-full flex flex-col">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Chọn Kênh Phát Sóng</h3>
        <div className="flex flex-col gap-3 overflow-y-auto flex-grow pr-2">
          {channels.map((ch) => {
            const active = ch.code === activeCode;
            return (
              <button
                key={ch.code}
                onClick={() => onSelect(ch.code)}
                className={
                  "text-left flex items-center p-3 rounded-lg cursor-pointer transition-colors relative overflow-hidden group " +
                  (active
                    ? "border-2 border-secondary-container bg-surface-container-low shadow-[0px_8px_24px_rgba(29,78,216,0.12)]"
                    : "border border-outline-variant bg-surface hover:bg-surface-container-low")
                }
              >
                {active && <div className="live-spotlight absolute inset-0 opacity-50" />}
                <div className="relative z-10 flex w-full items-center gap-4">
                  <LogoBox channel={ch} sizeClass="w-16 h-16" textClass="text-[18px]" />
                  <div className="flex-grow min-w-0">
                    <div className={`font-bold text-on-surface ${active ? "" : "group-hover:text-primary transition-colors"}`}>
                      {ch.name}
                    </div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant text-sm truncate">{ch.program}</div>
                  </div>
                  {active ? (
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps px-2 py-1 rounded shrink-0">
                      ĐANG CHỌN
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-outline group-hover:text-primary text-[20px] shrink-0">
                      open_in_new
                    </span>
                  )}
                </div>
              </button>
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
  const [activeCode, setActiveCode] = useState(
    () => initialLive?.activeChannel || initialChannels?.[0]?.code || null
  );
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
        if (data.channels) setChannels(data.channels);
        setUpdatedAt(new Date());
      } catch (e) {
        /* giữ dữ liệu cũ nếu lỗi mạng */
      }
    };
    const id = setInterval(tick, 10000); // polling tỉ số mỗi 10 giây
    tick();
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const activeChannel = channels.find((c) => c.code === activeCode) || channels[0] || null;
  const possession = live?.stats?.possession;
  const broadcastLabel = live?.broadcastChannel
    ? channels.find((c) => c.code === live.broadcastChannel)?.label || live.broadcastChannel
    : null;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 md:grid-cols-12 gap-gutter">
      <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
        {/* Featured channel -> link VTVGo */}
        <div className="relative w-full rounded-xl overflow-hidden video-container border border-outline-variant shadow-[0px_8px_24px_rgba(29,78,216,0.12)]">
          <img src={POSTER} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center gap-4 px-6">
            <LogoBox channel={activeChannel} sizeClass="w-24 h-24" textClass="text-headline-md" />

            <div>
              <h2 className="font-headline-md text-headline-md text-white">{activeChannel?.name}</h2>
              <p className="font-body-md text-body-md text-white/80 mt-1">{activeChannel?.program}</p>
            </div>
            {activeChannel?.watchUrl && (
              <a
                href={activeChannel.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-caps text-label-caps uppercase px-6 py-3 rounded-full hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">play_circle</span>
                Xem trên VTVGo
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </a>
            )}
            <p className="font-label-caps text-label-caps text-white/60 uppercase">
              Phát trên nền tảng chính thức của VTV
            </p>
          </div>
        </div>

        {/* Scoreboard / trạng thái trận */}
        {live ? (
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
            <div className="flex flex-col items-center gap-1">
              <span className="bg-error text-on-error font-label-caps text-label-caps px-3 py-1 rounded flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> ĐANG DIỄN RA
              </span>
              {broadcastLabel && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-label-caps text-label-caps uppercase px-3 py-1 rounded-full mt-1">
                  <span className="material-symbols-outlined text-[14px]">live_tv</span>
                  Trực tiếp: {broadcastLabel}
                </span>
              )}
              {updatedAt && (
                <span className="font-label-caps text-label-caps text-on-surface-variant mt-1">
                  Cập nhật {updatedAt.toLocaleTimeString("vi-VN")}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Hiện không có trận nào đang diễn ra. Bấm “Xem trên VTVGo” để xem chương trình đang phát của kênh đã chọn.
            {updatedAt && (
              <span className="ml-auto font-label-caps text-label-caps">Kiểm tra {updatedAt.toLocaleTimeString("vi-VN")}</span>
            )}
          </div>
        )}

        {/* Thống kê (nếu API có) */}
        {live?.stats && (
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

        {/* Bình luận (nếu có) */}
        {live?.commentary?.length > 0 && (
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-2">
              <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">Bình Luận Trực Tiếp</h3>
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
      </div>

      <ChannelList channels={channels} activeCode={activeCode} onSelect={setActiveCode} />
    </main>
  );
}
