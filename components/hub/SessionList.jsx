"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtDate, fmtTime, formatFee, relativeDay, weekdayOf, WEEKDAYS } from "@/lib/dc42";
import { Card, Chip, EmptyState, SportChip } from "./ui";

const ME_KEY = "dc42:me";

/* Danh sách buổi giao lưu + điểm danh.
   Chưa có đăng nhập -> người dùng tự chọn tên mình một lần, lưu ở localStorage.
   (Đây là chỗ thay bằng tài khoản thật khi có SSO.) */

export default function SessionList({ sessions, members, templates, shared }) {
  const [me, setMe] = useState("");
  const [state, setState] = useState(() =>
    Object.fromEntries(sessions.map((s) => [s.id, { going: s.going, out: s.out, slotsLeft: s.slotsLeft }]))
  );
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setMe(localStorage.getItem(ME_KEY) || "");
    } catch {
      /* trình duyệt chặn storage -> vẫn xem được, chỉ không nhớ tên */
    }
  }, []);

  const nameOf = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.short || m.name])), [members]);

  const pickMe = (id) => {
    setMe(id);
    try {
      localStorage.setItem(ME_KEY, id);
    } catch {
      /* bỏ qua */
    }
  };

  async function rsvp(sessionId, status) {
    if (!me) {
      setError("Chọn tên của bạn trước khi điểm danh.");
      return;
    }
    setBusy(sessionId + status);
    setError("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, memberId: me, status }),
      });
      const data = await res.json();
      if (!data.ok) {
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

  const byWeek = useMemo(() => {
    const groups = new Map();
    for (const s of sessions) {
      const key = weekLabel(s.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    return [...groups.entries()];
  }, [sessions]);

  return (
    <div className="flex flex-col gap-8">
      {/* Chọn tên */}
      <div className="flex flex-col gap-3 rounded-2xl border border-dc-line bg-dc-paper px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-dc-display text-[10px] font-bold uppercase tracking-[0.16em] text-dc-gold">Bạn là ai?</p>
          <p className="mt-0.5 text-[13.5px] text-dc-ink-2">
            Chọn tên để điểm danh. {shared ? "Danh sách dùng chung cho cả nhóm." : "Chưa nối KV nên điểm danh chỉ lưu tạm trên server này."}
          </p>
        </div>
        <select
          value={me}
          onChange={(e) => pickMe(e.target.value)}
          className="w-full rounded-xl border border-dc-line bg-white px-3 py-2.5 font-dc-display text-[13px] font-bold uppercase tracking-[0.08em] text-dc-ink md:w-64"
        >
          <option value="">— Chọn tên —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </p>
      ) : null}

      {/* Danh sách buổi */}
      {sessions.length === 0 ? (
        <EmptyState icon="event_busy" title="Ba tuần tới chưa có buổi nào" />
      ) : (
        byWeek.map(([week, list]) => (
          <div key={week}>
            <h2 className="mb-3 font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">{week}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((s) => {
                const row = state[s.id] || { going: [], out: [], slotsLeft: s.capacity };
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
                        <p className="font-dc-display text-[19px] font-bold leading-tight text-dc-ink">{s.title}</p>
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

                    {row.going.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
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
                        {row.out.length > 0 && (
                          <span className="px-1 py-1 text-[12.5px] text-dc-ink-2">
                            · vắng: {row.out.map((id) => nameOf[id] || id).join(", ")}
                          </span>
                        )}
                      </div>
                    )}

                    {s.note ? <p className="text-[13px] text-dc-ink-2">{s.note}</p> : null}

                    {!s.cancelled && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!me || busy === s.id + "in" || full || iAmIn}
                          onClick={() => rsvp(s.id, "in")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-dc-ink px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                          {iAmIn ? "Đã đăng ký" : full ? "Hết chỗ" : "Tôi tham gia"}
                        </button>
                        <button
                          type="button"
                          disabled={!me || busy === s.id + "out" || iAmOut}
                          onClick={() => rsvp(s.id, "out")}
                          className="inline-flex items-center gap-1.5 rounded-full border border-dc-line px-4 py-2 font-dc-display text-[11px] font-bold uppercase tracking-[0.12em] text-dc-ink-2 transition-colors hover:border-dc-ink hover:text-dc-ink disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <span className="material-symbols-outlined text-[16px]">event_busy</span>
                          {iAmOut ? "Đã báo vắng" : "Không đi"}
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Lịch cố định */}
      <div className="rounded-2xl border border-dc-line bg-white p-5">
        <h2 className="font-dc-display text-[11px] font-bold uppercase tracking-[0.18em] text-dc-ink-2">Lịch cố định</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-dc-line bg-dc-paper px-4 py-3">
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

function weekLabel(date) {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay();
  const monday = new Date(d.getTime() - ((day + 6) % 7) * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const f = (x) => `${String(x.getUTCDate()).padStart(2, "0")}/${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
  return `Tuần ${f(monday)} – ${f(sunday)}`;
}
