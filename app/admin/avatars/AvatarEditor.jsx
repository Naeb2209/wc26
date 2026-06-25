"use client";

import { useMemo, useRef, useState, useCallback } from "react";

const DEFAULT_POS = { x: 0, y: 0, scale: 1 };
const MASK = "linear-gradient(to bottom, #000 45%, transparent 96%)";

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function isDefault(p) {
  return !p || ((p.x || 0) === 0 && (p.y || 0) === 0 && (p.scale || 1) === 1);
}
function samePos(a, b) {
  const x = (a?.x || 0) === (b?.x || 0);
  const y = (a?.y || 0) === (b?.y || 0);
  const s = (a?.scale || 1) === (b?.scale || 1);
  return x && y && s;
}
function fmt(n) {
  return Math.round(n * 100) / 100;
}

// Một khung thẻ Fantasy (replica): container w-32 h-36, ảnh h-full w-auto + transform, mask đáy.
function PlayerFrame({ player, pos, saved, onChange, onSave, onReset }) {
  const imgRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const dirty = !samePos(pos, saved);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(true);
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const img = imgRef.current;
    if (!img) return;
    const w = img.offsetWidth || 1;
    const h = img.offsetHeight || 1;
    onChange({
      ...pos,
      x: fmt(pos.x + (e.movementX / w) * 100),
      y: fmt(pos.y + (e.movementY / h) * 100),
    });
  };
  const endDrag = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setDrag(false);
  };
  const onWheel = (e) => {
    e.preventDefault();
    onChange({ ...pos, scale: fmt(clamp((pos.scale || 1) * (1 - e.deltaY * 0.0015), 0.4, 3)) });
  };

  const transform = `translate(${pos.x || 0}%, ${pos.y || 0}%) scale(${pos.scale || 1})`;

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[12px] font-bold text-on-surface text-center leading-tight min-h-[2.4em] flex items-center">
        {player.name}
      </div>

      {/* Khung mô phỏng thẻ Fantasy */}
      <div
        className={`relative w-32 h-36 flex items-center justify-center rounded-xl border-2 ${
          drag ? "border-primary" : "border-white/15"
        } bg-[#0b3a2c] overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        title="Kéo để di chuyển · cuộn để phóng to/thu nhỏ"
      >
        {/* lưới căn giữa */}
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
        </div>
        <img
          ref={imgRef}
          src={player.avatar}
          alt=""
          draggable={false}
          className="relative h-full w-auto max-w-none shrink-0 pointer-events-none"
          style={{ maskImage: MASK, WebkitMaskImage: MASK, transform }}
        />
      </div>

      {/* Zoom */}
      <div className="w-full flex items-center gap-2">
        <span className="text-[11px] text-on-surface-variant">Zoom</span>
        <input
          type="range"
          min="0.4"
          max="3"
          step="0.01"
          value={pos.scale || 1}
          onChange={(e) => onChange({ ...pos, scale: fmt(Number(e.target.value)) })}
          className="flex-1 accent-primary"
        />
        <span className="text-[11px] font-data-mono text-on-surface w-9 text-right">{(pos.scale || 1).toFixed(2)}</span>
      </div>

      <div className="text-[10px] font-data-mono text-on-surface-variant">
        x:{pos.x || 0} y:{pos.y || 0}
      </div>

      <div className="flex items-center gap-2 w-full">
        <button
          onClick={onReset}
          className="flex-1 py-1 rounded-lg border border-white/20 text-[11px] text-on-surface hover:bg-white/10"
        >
          Reset
        </button>
        <button
          onClick={onSave}
          disabled={!dirty}
          className={`flex-1 py-1 rounded-lg text-[11px] font-bold ${
            dirty ? "bg-primary text-on-primary hover:brightness-110" : "bg-white/10 text-on-surface-variant cursor-default"
          }`}
        >
          {dirty ? "Lưu" : "Đã lưu"}
        </button>
      </div>
    </div>
  );
}

export default function AvatarEditor({ teams }) {
  const [teamCode, setTeamCode] = useState(teams[0]?.code || "");
  const team = useMemo(() => teams.find((t) => t.code === teamCode) || teams[0], [teams, teamCode]);

  // pos đang chỉnh (chưa chắc đã lưu) và pos đã lưu, keyed "CODE|name".
  const initPos = useMemo(() => {
    const m = {};
    for (const t of teams) for (const p of t.players) m[`${t.code}|${p.name}`] = { ...DEFAULT_POS, ...(p.avatarPos || {}) };
    return m;
  }, [teams]);

  const [pos, setPos] = useState(initPos);
  const [saved, setSaved] = useState(initPos);
  const [msg, setMsg] = useState(null);

  const setPlayerPos = useCallback((key, next) => {
    setPos((prev) => ({ ...prev, [key]: next }));
  }, []);

  const save = useCallback(
    async (t, p) => {
      const key = `${t.code}|${p.name}`;
      const next = pos[key];
      setMsg({ kind: "info", text: `Đang lưu ${p.name}…` });
      try {
        const res = await fetch("/api/avatar-pos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ teamCode: t.code, name: p.name, pos: isDefault(next) ? null : next }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Lỗi không rõ");
        setSaved((prev) => ({ ...prev, [key]: { ...DEFAULT_POS, ...(data.pos || {}) } }));
        setMsg({ kind: "ok", text: `Đã lưu ${p.name}` });
      } catch (e) {
        setMsg({ kind: "err", text: `Lỗi lưu ${p.name}: ${e.message}` });
      }
    },
    [pos]
  );

  const saveAll = useCallback(async () => {
    const dirty = team.players.filter((p) => !samePos(pos[`${team.code}|${p.name}`], saved[`${team.code}|${p.name}`]));
    if (!dirty.length) {
      setMsg({ kind: "info", text: "Không có thay đổi nào để lưu." });
      return;
    }
    for (const p of dirty) await save(team, p);
    setMsg({ kind: "ok", text: `Đã lưu ${dirty.length} cầu thủ của ${team.name}.` });
  }, [team, pos, saved, save]);

  const dirtyCount = team
    ? team.players.filter((p) => !samePos(pos[`${team.code}|${p.name}`], saved[`${team.code}|${p.name}`])).length
    : 0;

  return (
    <main className="w-full px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto">
      <h1 className="font-headline-lg text-headline-lg text-on-background mb-1">Chỉnh vị trí avatar trong khung Fantasy</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Kéo ảnh để chỉnh vị trí, cuộn chuột hoặc thanh Zoom để phóng to/thu nhỏ, rồi bấm <b>Lưu</b>. Vị trí lưu vào{" "}
        <span className="font-data-mono">data/db.json</span> (field <span className="font-data-mono">avatarPos</span>) và
        áp dụng cho thẻ cầu thủ ở tab Fantasy. Sau khi lưu, <b>khởi động lại dev server</b> để tab Fantasy nạp lại dữ liệu.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6 sticky top-0 z-20 bg-background/90 backdrop-blur py-3">
        <select
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant text-on-surface"
        >
          {teams.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name} ({t.players.length})
            </option>
          ))}
        </select>
        <button
          onClick={saveAll}
          disabled={!dirtyCount}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${
            dirtyCount ? "bg-primary text-on-primary hover:brightness-110" : "bg-white/10 text-on-surface-variant"
          }`}
        >
          Lưu tất cả {dirtyCount ? `(${dirtyCount})` : ""}
        </button>
        {msg && (
          <span
            className={`text-sm ${
              msg.kind === "err" ? "text-error" : msg.kind === "ok" ? "text-tertiary" : "text-on-surface-variant"
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {team?.players.map((p) => {
          const key = `${team.code}|${p.name}`;
          return (
            <PlayerFrame
              key={key}
              player={p}
              pos={pos[key]}
              saved={saved[key]}
              onChange={(next) => setPlayerPos(key, next)}
              onReset={() => setPlayerPos(key, { ...DEFAULT_POS })}
              onSave={() => save(team, p)}
            />
          );
        })}
      </div>
    </main>
  );
}
