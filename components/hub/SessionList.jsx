"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fmtDate, fmtTime, formatFee, relativeDay, splitAt, splitsTeams, weekdayOf, WEEKDAYS } from "@/lib/dc42";
import { Card, Chip, EmptyState, SportChip } from "./ui";
import SessionResult from "./SessionResult";
import TeamDraw from "./TeamDraw";
import LoginBox from "./LoginBox";
import { useAuth } from "./AuthProvider";

// Số cột của lưới lịch cố định, theo số mẫu buổi thực có.
const COLS = { 2: "md:grid-cols-2", 3: "md:grid-cols-3" };
// Nhãn đầu dòng "Đi 12" / "Vắng 3", cố định bề ngang để tên hai dòng thẳng cột.
const ROW_LABEL = "w-[64px] shrink-0 font-dc-display text-[10px] font-bold uppercase tracking-[0.14em]";

/* Danh sách buổi giao lưu + điểm danh.
   Muốn điểm danh thì phải đăng nhập: server lấy danh tính từ cookie đã ký, nên không ai
   điểm danh hộ người khác được. Tài khoản khai sẵn trong data — xem lib/auth.js.

   Buổi sắp tới: thẻ đầy đủ, có danh sách đăng ký và hai nút điểm danh.
   Buổi đã đá: thẻ gọn xếp hai cột, chỉ bảng đội + hiệu số; bấm vào thẻ mở trang buổi. */

export default function SessionList({ sessions, members, templates, shared, sportSlug, farmKing, streaks }) {
  // Ai đang đăng nhập + modal đăng nhập dùng chung toàn site (AuthProvider ở layout).
  const { user, setUser, openAuth } = useAuth();
  const me = user?.memberId || "";
  const [state, setState] = useState(() =>
    Object.fromEntries(sessions.map((s) => [s.id, { going: s.going, out: s.out, slotsLeft: s.slotsLeft }]))
  );
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const nameOf = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.short || m.name])), [members]);

  async function rsvp(sessionId, status) {
    if (!me) {
      // Mở thẳng modal đăng nhập, khỏi bắt người ta cuộn lên tìm ô đăng nhập.
      openAuth("login", "Đăng nhập (hoặc đăng ký nếu là lần đầu) để điểm danh buổi này.");
      return;
    }
    if (user?.needsPassword) {
      openAuth("password", "Đặt mật khẩu riêng trước, xong là điểm danh được ngay.");
      return;
    }
    setBusy(sessionId + status);
    setError("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.needsPassword) {
          openAuth("password", "Đặt mật khẩu riêng trước, xong là điểm danh được ngay.");
          return;
        }
        if (res.status === 401) {
          // Phiên hết hạn hoặc bị đá ra vì chủ tài khoản vừa đổi mật khẩu.
          setUser(null);
          openAuth("login", "Phiên đăng nhập đã hết — đăng nhập lại nhé.");
          return;
        }
        setError(data.error || "Không lưu được điểm danh.");
        return;
      }
      setState((prev) => ({ ...prev, [sessionId]: { going: data.going, out: data.out, slotsLeft: data.slotsLeft } }));
    } catch {
      setError("Mất kết nối, thử lại giúp mình.");
    } finally {
      setBusy(null);
    }
  }

  // Một đồng hồ cho cả trang: đếm ngược và mốc khoá điểm danh phải nhảy cùng một nhịp,
  // không thì có cửa sổ vài chục giây vừa lộ đội vừa còn điểm danh được.
  // null = chưa mount -> server và client render giống nhau.
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const locked = (s) => splitsTeams(s) && now !== null && now >= splitAt(s);

  const upcoming = useMemo(() => sessions.filter((s) => !s.past), [sessions]);
  const past = useMemo(() => sessions.filter((s) => s.past), [sessions]);
  const hrefOf = (s) => `/the-thao/${sportSlug}/giao-luu/${encodeURIComponent(s.id)}`;
  const rowOf = (s) => state[s.id] || { going: [], out: [], slotsLeft: s.capacity };

  return (
    <div className="flex flex-col gap-8">
      {/* Hai bảng vàng mở đầu trang: ghi nhiều nhất và đi đều nhất. Có đủ cả hai thì xếp cạnh nhau. */}
      {farmKing || streaks ? (
        <div className={`grid gap-3 ${farmKing && streaks ? "lg:grid-cols-2" : ""}`}>
          {farmKing}
          {streaks}
        </div>
      ) : null}

      <LoginBox shared={shared} />

      {error ? (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </p>
      ) : null}

      {sessions.length === 0 ? <EmptyState icon="event_busy" title="Chưa có buổi nào sắp tới hay vừa đá" /> : null}

      {/* Buổi sắp tới */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-3 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">
            Buổi sắp tới
          </h2>
          <div className={`grid gap-3 ${upcoming.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {upcoming.map((s) => {
              const row = rowOf(s);
              const iAmIn = me && row.going.includes(me);
              const iAmOut = me && row.out.includes(me);
              const full = row.slotsLeft === 0 && !iAmIn;
              const pct = Math.min(100, Math.round((row.going.length / (s.capacity || 1)) * 100));

              return (
                <Card key={s.id} id={s.id} className={`flex flex-col gap-4 p-5 ${s.cancelled ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <SportChip sport={s.sport} />
                        {s.cancelled ? <Chip tone="live">Đã huỷ</Chip> : <Chip>{relativeDay(s.startsAt)}</Chip>}
                      </div>
                      <Link
                        href={hrefOf(s)}
                        className="font-dc-display text-[19px] font-bold leading-tight text-dc-ink hover:text-dc-gold"
                      >
                        {s.title}
                      </Link>
                      <p className="mt-1 text-[13.5px] text-dc-ink-2">
                        {weekdayOf(s.startsAt)}, {fmtDate(s.startsAt)} · {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
                      </p>
                      <p className="text-[13.5px] text-dc-ink-2">
                        {s.venue?.name} · {formatFee(s.fee)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-dc-display text-[26px] font-bold leading-none tabular-nums text-dc-ink">
                        {row.going.length}
                        <span className="text-[15px] text-dc-ink-2">/{s.capacity}</span>
                      </p>
                      <p className="mt-1 font-dc-display text-[10px] font-bold uppercase tracking-[0.12em] text-dc-ink-2">
                        {row.slotsLeft > 0 ? `còn ${row.slotsLeft} chỗ` : "đã đủ"}
                      </p>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-dc-bone">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-dc-gold" : "bg-dc-ink"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Đi và vắng mỗi bên một dòng có nhãn + số. Vắng để chữ xám, không đóng khung,
                      để nhìn là biết không tính vào sĩ số; chưa ai đi thì vẫn thấy ai đã báo vắng. */}
                  {row.going.length > 0 || row.out.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {row.going.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`${ROW_LABEL} text-dc-ink`}>
                            Đi <span className="tabular-nums text-dc-ink-2">{row.going.length}</span>
                          </span>
                          {row.going.map((id) => (
                            <span
                              key={id}
                              className={`rounded-lg px-2 py-1 text-[12.5px] ${
                                id === me ? "bg-dc-ink text-white" : "bg-dc-bone text-dc-ink"
                              }`}
                            >
                              {nameOf[id] || id}
                            </span>
                          ))}
                        </div>
                      )}
                      {row.out.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className={`${ROW_LABEL} text-dc-ink-2`}>
                            Vắng <span className="tabular-nums">{row.out.length}</span>
                          </span>
                          {row.out.map((id) => (
                            <span
                              key={id}
                              className={`text-[12.5px] line-through decoration-dc-ink-2/40 ${
                                id === me ? "font-semibold text-dc-ink" : "text-dc-ink-2"
                              }`}
                            >
                              {nameOf[id] || id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {!s.cancelled && splitsTeams(s) && (
                    <TeamDraw session={s} going={row.going} nameOf={nameOf} now={now} />
                  )}

                  {s.note ? <p className="text-[13px] text-dc-ink-2">{s.note}</p> : null}

                  {!s.cancelled && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy === s.id + "in" || (me && (full || iAmIn)) || locked(s)}
                        onClick={() => rsvp(s.id, "in")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-dc-ink px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        {!me
                          ? "Đăng nhập để điểm danh"
                          : iAmIn
                            ? "Đã đăng ký"
                            : locked(s)
                              ? "Đã chốt"
                              : full
                                ? "Hết chỗ"
                                : "Tôi tham gia"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === s.id + "out" || (me && iAmOut) || locked(s)}
                        onClick={() => rsvp(s.id, "out")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dc-line px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                        {iAmOut ? "Đã báo vắng" : "Không đi"}
                      </button>

                      <Link
                        href={hrefOf(s)}
                        className="ml-auto inline-flex items-center gap-1.5 self-center font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:text-dc-gold"
                      >
                        Xem toàn trang
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Buổi đã đá: thẻ gọn, hai cột, cả thẻ là một link sang trang buổi. */}
      {past.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">
            Buổi đã qua
            <span className="tabular-nums text-dc-ink-2/60">{past.length} buổi</span>
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {past.map((s) => {
              const row = rowOf(s);
              return (
                <Card key={s.id} href={hrefOf(s)} className={`flex flex-col gap-3 p-4 ${s.cancelled ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-dc-display text-[15px] font-bold leading-tight text-dc-ink">
                        {weekdayOf(s.startsAt)}, {fmtDate(s.startsAt)}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-dc-ink-2">
                        {relativeDay(s.startsAt)} · {s.venue?.name}
                      </p>
                    </div>
                    <p className="shrink-0 text-right font-dc-display text-[13px] font-bold tabular-nums text-dc-ink-2">
                      {row.going.length}
                      <span className="text-dc-ink-2/60">/{s.capacity}</span>
                    </p>
                  </div>

                  {s.cancelled ? (
                    <p className="text-[12.5px] text-dc-ink-2">Đã huỷ{s.cancelReason ? ` · ${s.cancelReason}` : ""}</p>
                  ) : s.result ? (
                    <SessionResult result={s.result} sport={s.sport} nameOf={nameOf} variant="card" />
                  ) : (
                    <p className="text-[12.5px] text-dc-ink-2">Chưa nhập kết quả.</p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Lịch cố định */}
      <div className="rounded-2xl border border-dc-line bg-white p-5">
        <h2 className="font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">Lịch cố định</h2>
        <ul className={`mt-3 grid gap-3 ${COLS[Math.min(templates.length, 3)] || ""}`}>
          {templates.map((t) => (
            <li
              key={t.id}
              className={`rounded-xl border border-dc-line bg-dc-paper px-4 py-3 ${
                templates.length > 1 ? "" : "max-w-card-max"
              }`}
            >
              <p className="font-dc-display text-[14px] font-bold text-dc-ink">{WEEKDAYS[t.weekday]}</p>
              <p className="text-[13px] text-dc-ink-2">
                {t.start}–{t.end} · {t.venue}
              </p>
              <p className="text-[13px] text-dc-ink-2">
                {t.capacity} chỗ · {formatFee(t.fee)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
