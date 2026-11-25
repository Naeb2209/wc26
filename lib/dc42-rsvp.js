import { getKv } from "./kv";

// Điểm danh buổi giao lưu — phần dữ liệu duy nhất của DC42 Hub thay đổi theo giờ.
//
// Có KV (Upstash/Vercel KV) -> lưu ở đó, mọi người thấy chung.
// Chưa cấu hình KV -> lưu tạm trong bộ nhớ tiến trình để dev/preview vẫn bấm được;
// dữ liệu này mất khi server khởi động lại, và không chia sẻ giữa các instance.
//
// Chỉ lưu phần KHÁC mặc định: ai trong danh sách "regulars" của mẫu buổi mặc nhiên là "in",
// nên bảng lưu chỉ chứa những thay đổi thực sự -> gọn và không cần seed.

const KEY = (sessionId) => `dc42:rsvp:${sessionId}`;

const memory = (globalThis.__dc42Rsvp ??= new Map());

export const RSVP_IN = "in";
export const RSVP_OUT = "out";

export async function getRsvp(sessionId) {
  const kv = getKv();
  if (!kv) return { ...(memory.get(sessionId) || {}) };
  try {
    return (await kv.hgetall(KEY(sessionId))) || {};
  } catch (e) {
    console.error("[dc42-rsvp] Đọc KV lỗi, dùng bộ nhớ tạm:", e.message);
    return { ...(memory.get(sessionId) || {}) };
  }
}

export async function setRsvp(sessionId, memberId, status) {
  const value = status === RSVP_IN ? RSVP_IN : RSVP_OUT;
  const kv = getKv();
  if (kv) {
    try {
      await kv.hset(KEY(sessionId), { [memberId]: value });
      return value;
    } catch (e) {
      console.error("[dc42-rsvp] Ghi KV lỗi, ghi bộ nhớ tạm:", e.message);
    }
  }
  const current = memory.get(sessionId) || {};
  current[memberId] = value;
  memory.set(sessionId, current);
  return value;
}

/** Danh sách đi / không đi: lấy thẳng pots[] nếu buổi có khai, không thì ghép regulars với thay đổi đã lưu. */
export function rosterOf(session, overrides = {}) {
  // Buổi đã khai pots[] thì người trong pot chính là danh sách đi — ban tổ chức chốt tay
  // rồi, điểm danh không còn quyết định gì nữa, nên không trộn regulars vào.
  const potted = (session.pots || []).flat();
  // Người thêm tay vào đội sau khi bốc (teams[] của override) cũng là người đi.
  const added = (session.teams || []).flatMap((t) => t.members || []).filter((id) => !potted.includes(id));
  const fixed = potted.length > 0 ? [...potted, ...added] : [];
  if (fixed.length > 0) {
    return { going: fixed, out: [], slotsLeft: Math.max(0, (session.capacity || 0) - fixed.length) };
  }

  const going = [];
  const out = [];

  for (const id of session.regulars || []) {
    if (overrides[id] === RSVP_OUT) out.push(id);
    else going.push(id);
  }
  for (const [id, status] of Object.entries(overrides)) {
    if (session.regulars?.includes(id)) continue;
    if (status === RSVP_IN) going.push(id);
    else out.push(id);
  }

  return { going, out, slotsLeft: Math.max(0, (session.capacity || 0) - going.length) };
}
