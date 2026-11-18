"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DRAND, drandRound, drandUrl, drawTeams, fmtDate, fmtTime, memberName, splitAt, splitAtVn } from "@/lib/dc42";

/* Bốc thăm chia đội của buổi bóng đá — đếm ngược rồi quay.

   Nguồn ngẫu nhiên là drand: round công bố đúng tại mốc chốt, trước đó không ai biết,
   sau đó ai tra cũng ra cùng số. Nên kết quả vừa không đoán trước được, vừa giống nhau
   ở mọi máy mà không phải lưu gì, lại có link kiểm chứng ở cuối khối.

   Hiệu ứng chạy theo một lịch cố định tính từ mốc chốt, nên mọi người mở cùng lúc thì
   xem cùng một lượt quay; ai vào muộn thì những lượt đã qua hiện thẳng, không tua lại.

   Trong danh sách buổi, SessionList truyền `now` xuống để lộ đội và khoá điểm danh nhảy
   cùng nhịp; ở trang buổi thì khối tự chạy đồng hồ của nó. */

const DOT = {
  red: "bg-dc-kit-red",
  blue: "bg-dc-kit-blue",
  yellow: "bg-dc-kit-yellow",
  light: "bg-white ring-1 ring-inset ring-dc-line",
  dark: "bg-dc-ink",
};

const CHIP = {
  red: "bg-dc-kit-red text-white",
  blue: "bg-dc-kit-blue text-white",
  yellow: "bg-dc-kit-yellow text-white",
  light: "bg-dc-bone text-dc-ink ring-1 ring-inset ring-dc-line",
  dark: "bg-dc-ink text-white",
};

const LEAD_MS = 5000; // khoảng lấy số ngẫu nhiên trước lượt quay đầu
const SPIN_MS = 7000; // thời gian guồng chạy mỗi lượt
const STEP = SPIN_MS + 1500; // trọn một lượt có quay
const AUTO_STEP = 1600; // lượt "người cuối", hiện thẳng
const BIG_FROM = 10; // còn bấy nhiêu giây thì đếm ngược bằng số to

const PAD = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function countdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} ngày ${h} giờ`;
  return `${PAD(h)}:${PAD(m)}:${PAD(s)}`;
}

function Dot({ color, className = "h-2.5 w-2.5" }) {
  return <span aria-hidden="true" className={`${className} shrink-0 rounded-full ${DOT[color] || "bg-dc-ink-2"}`} />;
}

/* Round của mốc chốt chỉ được công bố vài giây sau mốc đó, nên lần gọi đầu hụt là chuyện
   thường -> thử lại vòng qua các host. Mỗi lần gọi có hạn 3 giây để một host treo không
   làm kẹt cả khối; hết lượt vẫn không có thì trả null và rơi về seed dự phòng. */
async function fetchBeacon(round, tries = 10) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(drandUrl(round, DRAND.hosts[i % DRAND.hosts.length]), {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.randomness) return data.randomness;
      }
    } catch {
      /* mạng chặn, host treo, hoặc beacon chưa ra -> thử host khác */
    }
    await sleep(900);
  }
  return null;
}

export default function TeamDraw({ session, going, nameOf = {}, now, variant = "card" }) {
  // "page": trang riêng của buổi — guồng to, pot và đội nằm hai cột, cả nhóm cùng xem.
  const full = variant === "page";
  const at = splitAt(session);
  const atText = splitAtVn(session);

  // Trong danh sách buổi, SessionList giữ đồng hồ và truyền xuống để việc lộ đội và việc
  // khoá điểm danh nhảy cùng nhịp. Đứng một mình (trang buổi) thì tự chạy đồng hồ lấy.
  const owns = now === undefined;
  const [self, setSelf] = useState(null);
  useEffect(() => {
    if (!owns) return;
    setSelf(Date.now());
    const id = setInterval(() => setSelf(Date.now()), 1000);
    return () => clearInterval(id);
  }, [owns]);
  const clock = owns ? self : now;

  const [seed, setSeed] = useState(null); // randomness của drand, null = chưa lấy
  const [asking, setAsking] = useState(false);
  const [shown, setShown] = useState(0); // số lượt đã chốt trên màn hình
  // Khung quay: {index, until, rolling}. Giữ nguyên suốt cả lượt bốc — tháo ra lắp lại giữa
  // hai lượt thì khối co giãn và cả trang nhảy theo.
  const [frame, setFrame] = useState(null);
  const [copied, setCopied] = useState(false);
  const asked = useRef(false);

  const done = clock != null && at !== null && clock >= at;
  const round = at ? drandRound(at) : null;
  const key = going.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draw = useMemo(() => drawTeams(session, going, seed), [session.id, key, seed]);

  // Qua mốc chốt thì lấy số ngẫu nhiên công khai, đúng một lần.
  useEffect(() => {
    if (!done || asked.current) return;
    asked.current = true;

    let alive = true;
    (async () => {
      setAsking(true);
      const randomness = await fetchBeacon(round);
      if (!alive) return;
      setSeed(randomness); // null -> drawTeams tự rơi về seed dự phòng
      setAsking(false);
    })();

    return () => {
      alive = false;
    };
  }, [done, round]);

  // Lịch chiếu: lượt thứ k bắt đầu ở một mốc cố định, nên ai mở cùng lúc thì xem cùng lượt.
  useEffect(() => {
    if (!done || !draw || asking || !asked.current) return;

    let alive = true;
    (async () => {
      let start = at + LEAD_MS;
      for (let k = 0; k < draw.picks.length; k++) {
        const pick = draw.picks[k];
        const dur = pick.auto ? AUTO_STEP : STEP;

        // Lượt đã trôi qua -> chốt thẳng, không tua lại cho người vào muộn.
        if (Date.now() >= start + dur) {
          start += dur;
          if (alive) setShown(k + 1);
          continue;
        }
        if (Date.now() < start) await sleep(start - Date.now());
        if (!alive) return;

        if (pick.auto) {
          // Người cuối của pot: hiện thẳng trong khung, không quay.
          setFrame({ index: k, rolling: false });
        } else {
          const until = Date.now() + Math.max(400, start + SPIN_MS - Date.now());
          setFrame({ index: k, until, rolling: true });
          await sleep(until - Date.now());
          if (!alive) return;
          // Dừng lại nhưng vẫn giữ khung, tên vừa trúng đứng yên ở giữa.
          setFrame({ index: k, rolling: false });
        }

        setShown(k + 1);
        start += dur;
        await sleep(pick.auto ? 300 : 500);
        if (!alive) return;
      }
      if (alive) {
        setShown(draw.picks.length);
        setFrame(null);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, asking, seed, at]);

  if (!at) return null;

  const nameOrId = (id) => nameOf[id] || memberName(id);
  const picks = draw?.picks || [];
  const settled = picks.slice(0, shown);
  const staged = frame !== null ? picks[frame.index] : null;
  // Pot chỉ sáng khi đang quay thật, không sáng ở nhịp nghỉ giữa hai lượt.
  const spinning = frame?.rolling ? staged : null;
  const finished = draw && shown >= picks.length;

  // Đội dựng dần theo số lượt đã chốt, để màn hình bám đúng tiến trình.
  // Giữ cả pick (có số pot) để mỗi dòng nói được người đó ra từ pot nào.
  const live = (draw?.teams || []).map((t) => {
    const mine = settled.filter((p) => p.teamId === t.id);
    return { ...t, picks: mine, members: mine.map((p) => p.id) };
  });

  // Số suất mỗi đội -> dựng sẵn ô trống, nhìn ra ngay còn thiếu mấy người.
  const perTeam = draw ? Math.ceil(picks.length / draw.count) : 0;
  // Tra ngược: ai đã về đội nào, để chip trong pot ăn màu áo.
  const kitOf = Object.fromEntries(settled.map((p) => [p.id, draw?.teams.find((t) => t.id === p.teamId)?.color]));

  const copy = () => {
    const text = live
      .map((t) => `${t.name}\n` + t.members.map((id, i) => `  ${i + 1}. ${nameOrId(id)}`).join("\n"))
      .join("\n\n");
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {}
    );
  };

  const left = clock == null ? 0 : at - clock;
  const big = !done && clock != null && left <= BIG_FROM * 1000;

  return (
    <div className={`rounded-xl border border-dc-line bg-dc-paper ${full ? "p-5" : "p-3"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p
          className={`flex items-center gap-1.5 font-dc-display font-bold uppercase tracking-[0.16em] text-dc-ink-2 ${
            full ? "text-[11px]" : "text-[9.5px]"
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">casino</span>
          {done ? `Đội đã bốc · ${draw ? draw.count : 0} đội` : big ? "Chuẩn bị quay" : "Bốc thăm chia đội sau"}
        </p>
        {clock == null ? (
          <p className="font-dc-display text-[12px] font-bold tabular-nums text-dc-ink-2">
            {fmtTime(atText)} · {fmtDate(atText)}
          </p>
        ) : done ? (
          <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.14em] text-dc-ink-2">
            Chốt lúc {fmtTime(atText)} · {fmtDate(atText)}
          </p>
        ) : big ? null : (
          <p
            className={`font-dc-display font-bold leading-none tabular-nums text-dc-ink ${
              full ? "text-[34px]" : "text-[19px]"
            }`}
          >
            {countdown(left)}
          </p>
        )}
      </div>

      {/* Mười giây cuối: số to đếm lùi, để cả nhóm cùng ngóng một chỗ. */}
      {big && (
        <p
          className={`text-center font-dc-display font-bold leading-none tabular-nums text-dc-ink ${
            full ? "py-6 text-[140px]" : "py-2 text-[64px]"
          }`}
        >
          {Math.max(0, Math.ceil(left / 1000))}
        </p>
      )}

      {!done ? (
        !big && (
          <p className="mt-2 text-[12.5px] text-dc-ink-2">
            {!draw
              ? "Chưa đủ người để chia đội — điểm danh thêm đã."
              : (session.pots || []).length
                ? `${draw.pots.length} pot ban tổ chức đã xếp, mỗi pot quay random rải đều ${draw.count} đội.`
                : "Chia theo POT trình độ, mỗi POT quay random rải đều các đội. Điểm danh khoá khi hết giờ."}
          </p>
        )
      ) : !draw ? (
        <p className="mt-2 text-[12.5px] text-dc-ink-2">Chưa đủ người để chia đội.</p>
      ) : (
        <>
          {asking && (
            <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-dc-ink-2">
              <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
              Đang lấy số ngẫu nhiên công khai…
            </p>
          )}

          {/* Guồng quay: tên trôi lên rồi chậm dần, dừng đúng ở người được bốc. Khung đứng
              yên cả lượt bốc, nhịp nghỉ chỉ là tên vừa trúng nằm im ở giữa. */}
          {staged && (
            <Reel
              pick={staged}
              draw={draw}
              nameOrId={nameOrId}
              until={frame.until}
              rolling={!!frame.rolling}
              full={full}
            />
          )}

          {/* Đội: ô trống sẵn đủ suất, mỗi dòng nói rõ người đó ra từ pot nào. */}
          <div className={`grid ${full ? "mt-4 gap-3" : "mt-3 gap-2"} ${
            draw.count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}>
            {live.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-lg border border-dc-line bg-white">
                <p
                  className={`flex items-center gap-2 bg-dc-bone font-dc-display font-bold uppercase tracking-[0.12em] text-dc-ink ${
                    full ? "px-3 py-2.5 text-[12.5px]" : "px-2.5 py-2 text-[11px]"
                  }`}
                >
                  <Dot color={t.color} className={full ? "h-3 w-3" : "h-2.5 w-2.5"} />
                  {t.name}
                  <span className="ml-auto tabular-nums text-dc-ink-2">
                    {t.members.length}/{perTeam}
                  </span>
                </p>
                <span aria-hidden="true" className={`block h-1 ${DOT[t.color] || "bg-dc-ink-2"}`} />

                <ul className={full ? "px-3 py-1.5" : "px-2.5 py-1"}>
                  {Array.from({ length: perTeam }, (_, k) => {
                    const row = t.picks[k];
                    return (
                      <li
                        key={k}
                        className={`grid grid-cols-[42px_minmax(0,1fr)] items-baseline gap-2 border-b border-dashed border-dc-line last:border-b-0 ${
                          full ? "py-2 text-[13.5px]" : "py-1.5 text-[12.5px]"
                        }`}
                      >
                        <span className="font-dc-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-dc-gold">
                          {row ? `Pot ${row.pot + 1}` : ""}
                        </span>
                        <span className={`truncate ${row ? "text-dc-ink" : "text-dc-ink-2/45"}`}>
                          {row ? nameOrId(row.id) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Pot chỉ hiện ở trang riêng; trong thẻ danh sách đã có nhãn pot trên từng dòng đội,
              bày thêm lưới pot nữa là thừa chỗ. */}
          {full && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {draw.pots.map((pot, i) => (
              <div
                key={i}
                className={`rounded-lg border px-2.5 py-2 ${
                  spinning && spinning.pot === i
                    ? "border-dc-gold bg-dc-gold-soft"
                    : "border-dc-line bg-white"
                }`}
              >
                <p className="pb-1.5 font-dc-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
                  Pot {i + 1}
                </p>
                <div className="flex flex-wrap gap-1">
                  {pot.map((id) => {
                    const at = kitOf[id];
                    return (
                      <span
                        key={id}
                        className={`rounded-full px-2 py-0.5 text-[12px] ${
                          at ? CHIP[at] || "bg-dc-ink text-white" : "border border-dc-line text-dc-ink-2"
                        }`}
                      >
                        {nameOrId(id)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          )}

          {finished && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dc-line pt-2.5">
              <p className="text-[11px] text-dc-ink-2">
                {seed ? (
                  <>
                    Số ngẫu nhiên:{" "}
                    <a
                      href={drandUrl(round)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dc-line underline-offset-2 hover:text-dc-gold"
                    >
                      drand round #{round}
                    </a>
                  </>
                ) : (
                  "Không gọi được drand — dùng seed dự phòng từ buổi và danh sách đi."
                )}
              </p>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-full border border-dc-line px-3 py-1.5 font-dc-display text-[10px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink"
              >
                <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
                {copied ? "Đã copy" : "Copy kết quả"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Guồng tên kiểu máy quay: dải tên chạy lên, chậm dần theo ease-out bậc 4 rồi dừng sao cho
   người được bốc nằm đúng hàng giữa. Dải chỉ gồm những người còn lại của POT đó, lặp vòng,
   nên nhìn là biết lượt này đang tranh nhau giữa ai với ai. */
function Reel({ pick, draw, nameOrId, until, rolling = true, full = false }) {
  const stripRef = useRef(null);
  const team = draw.teams.find((t) => t.id === pick.teamId);

  // Người còn lại của POT ở lượt này: các pick cùng POT từ lượt này trở đi.
  const from = draw.picks.indexOf(pick);
  const pool = draw.picks.filter((p, i) => p.pot === pick.pot && i >= from);
  const names = pool.map((p) => nameOrId(p.id));

  // Dải tên dựng đúng MỘT lần cho mỗi lượt. Tính lại theo Date.now() ở mỗi render thì dải
  // ngắn dần từng giây trong khi animation vẫn chạy tới mốc cũ -> cuối lượt trượt quá dải
  // và ô guồng trống trơn.
  const strip = useMemo(() => {
    const rows = Math.max(8, Math.round(Math.max(300, (until || 0) - Date.now()) / 110));
    const out = [""];
    for (let k = rows; k >= -1; k--) out.push(names[(((0 - k) % names.length) + names.length) % names.length]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || !rolling) return;
    const row = el.firstChild?.getBoundingClientRect().height || 24;
    const endY = -(strip.length - 3) * row;
    const dur = Math.max(300, until - Date.now());
    const t0 = performance.now();
    let raf;

    const frame = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.style.transform = `translateY(${endY * (1 - Math.pow(1 - k, 4))}px)`;
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until, rolling]);

  return (
    <div className="mt-3">
      <p
        className={`flex flex-wrap items-center gap-1.5 pb-1.5 font-dc-display font-bold uppercase tracking-[0.12em] text-dc-ink-2 ${
          full ? "justify-center text-[12px]" : "text-[10px]"
        }`}
      >
        Pot {pick.pot + 1}
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        <Dot color={team?.color} className="h-2 w-2" />
        {team?.name}
      </p>
      <div
        className={`relative overflow-hidden rounded-lg border-2 border-dc-line bg-white ${
          full ? "h-[132px]" : "h-[72px]"
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 border-y-[7px] border-l-[10px] border-y-transparent border-l-dc-gold"
        />
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 border-y-[7px] border-r-[10px] border-y-transparent border-r-dc-gold"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(white,transparent_38%,transparent_62%,white)]"
        />
        <div ref={stripRef} className="will-change-transform">
          {(rolling ? strip : [nameOrId(pick.id)]).map((n, i) => (
            <div
              key={i}
              className={`flex items-center justify-center overflow-hidden whitespace-nowrap px-10 font-dc-display font-bold text-dc-ink ${
                full ? "h-11 text-[27px] leading-[44px]" : "h-6 text-[16px] leading-6"
              } ${rolling ? "" : full ? "mt-11" : "mt-6"}`}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
