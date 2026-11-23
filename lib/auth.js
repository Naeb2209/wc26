import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getHub, memberById } from "./dc42";
import { getKv } from "./kv";

/* Đăng nhập tối giản cho DC42 Hub.

   Mỗi người một mật khẩu riêng (hash scrypt, lưu ở KV). Mật khẩu chung của nhóm
   (DC42_PASSWORD) chỉ còn hai việc:
   - làm cửa chặn lúc đăng ký: người ngoài không biết thì không tạo được tài khoản;
   - cho tài khoản CHƯA có mật khẩu riêng (31 tài khoản khai sẵn trong data) vào lần đầu —
     vào xong bắt buộc đặt mật khẩu riêng rồi mới điểm danh được. Đặt rồi thì mật khẩu
     nhóm không mở được tài khoản đó nữa.

   Quên mật khẩu: thêm username vào `passwordResets` trong dc42.json kèm mốc giờ
   ({ "bean": "2026-11-23T20:00:00+07:00" }) rồi deploy — mật khẩu đặt trước mốc đó bị bỏ,
   người đó vào lại bằng mật khẩu nhóm và đặt mật khẩu mới.

   Phiên lưu trong cookie httpOnly có chữ ký HMAC, nên client không tự sửa được memberId.
   Cookie cấp trước lúc đặt/đổi mật khẩu bị coi là hết hạn — ai từng vào hộ bằng mật khẩu
   nhóm sẽ bị đá ra ngay khi chủ tài khoản đặt mật khẩu riêng. */

const COOKIE = "dc42_session";
const MAX_AGE = 30 * 24 * 3600; // 30 ngày

const groupPassword = () => process.env.DC42_PASSWORD || "123";
const secret = () => process.env.DC42_AUTH_SECRET || "dc42-dev-secret-doi-khi-len-that";

export const accounts = () => getHub().accounts || [];

/* Tài khoản tự đăng ký trên web — lưu ở KV (hash username -> {u, m, name}), không commit
   vào data nên đăng ký xong dùng được ngay, khỏi chờ deploy. Chưa nối KV thì giữ tạm trong
   bộ nhớ tiến trình cho dev, giống điểm danh.

   `m` của người tự đăng ký:
   - tên trùng đúng `name` của một thành viên CHƯA có tài khoản -> buộc vào thành viên đó;
   - còn lại -> chính cái tên, đúng kiểu tên viết thẳng đang dùng trong pots/teams/goals,
     nên ai từng được ghi bằng tên (vd "Bean") đăng ký xong là khớp luôn dữ liệu cũ. */
const SIGNUP_KEY = "dc42:accounts";
const PASSWORD_KEY = "dc42:passwords"; // username -> { salt, hash, at }
const signupMemory = (globalThis.__dc42Accounts ??= new Map());
const passwordMemory = (globalThis.__dc42Passwords ??= new Map());

const MIN_PASSWORD = 4;

const normUser = (username) => String(username || "").trim().toLowerCase();
const normName = (name) => String(name || "").trim().replace(/\s+/g, " ");
const fold = (s) => normName(s).toLocaleLowerCase("vi");

const parse = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const sameString = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

const isGroupPassword = (pass) => sameString(pass ?? "", groupPassword());

/* ---------------- tài khoản ---------------- */

async function signupAccounts() {
  const kv = getKv();
  if (!kv) return [...signupMemory.values()];
  const all = (await kv.hgetall(SIGNUP_KEY)) || {};
  return Object.values(all).map(parse).filter(Boolean);
}

async function signupAccount(u) {
  const kv = getKv();
  if (!kv) return signupMemory.get(u) || null;
  return parse(await kv.hget(SIGNUP_KEY, u));
}

/** Tài khoản theo username: khai sẵn trong data trước, rồi tới tài khoản tự đăng ký. */
export async function accountByUsername(username) {
  const u = normUser(username);
  if (!u) return null;
  return accounts().find((a) => a.u === u) || (await signupAccount(u));
}

/** Thành viên ứng với một tài khoản. Người tự đăng ký chưa có trong members[] thì dựng tạm. */
function memberOf(account) {
  if (!account) return null;
  return memberById(account.m) || (account.name ? { id: account.m, name: account.name, short: account.name } : null);
}

/* ---------------- mật khẩu riêng ---------------- */

const hashOf = (pass, salt) => scryptSync(String(pass), salt, 64).toString("base64");

/** Mật khẩu riêng còn hiệu lực của một username, chưa có (hoặc đã bị reset) thì null. */
async function passwordRecord(u) {
  const kv = getKv();
  const rec = kv ? parse(await kv.hget(PASSWORD_KEY, u)) : passwordMemory.get(u) || null;
  if (!rec?.hash) return null;
  const reset = Date.parse(getHub().passwordResets?.[u] || "");
  if (!Number.isNaN(reset) && (rec.at || 0) < reset) return null;
  return rec;
}

async function savePassword(u, pass) {
  const salt = randomBytes(16).toString("base64");
  const rec = { salt, hash: hashOf(pass, salt), at: Date.now() };
  const kv = getKv();
  if (kv) await kv.hset(PASSWORD_KEY, { [u]: JSON.stringify(rec) });
  else passwordMemory.set(u, rec);
  return rec;
}

function checkPassword(rec, pass) {
  return sameString(hashOf(pass ?? "", rec.salt), rec.hash);
}

/** Lỗi của một mật khẩu mới, hợp lệ thì null. */
function weakPassword(pass) {
  const p = String(pass ?? "");
  if (p.length < MIN_PASSWORD) return `Mật khẩu riêng ít nhất ${MIN_PASSWORD} ký tự.`;
  if (p.length > 64) return "Mật khẩu dài quá (tối đa 64 ký tự).";
  if (isGroupPassword(p)) return "Đừng dùng lại mật khẩu nhóm — đặt cái của riêng bạn.";
  return null;
}

/* ---------------- đăng nhập / đăng ký / đổi mật khẩu ---------------- */

/** Đúng username + mật khẩu -> { username, member, needsPassword }, sai thì null.
    Tài khoản đã có mật khẩu riêng chỉ nhận mật khẩu riêng; chưa có thì nhận mật khẩu nhóm
    và trả needsPassword để giao diện bắt đặt mật khẩu riêng. */
export async function login(username, pass) {
  const account = await accountByUsername(username);
  const member = memberOf(account);
  if (!member) return null;

  const rec = await passwordRecord(account.u);
  if (rec) return checkPassword(rec, pass) ? { username: account.u, member, needsPassword: false } : null;
  return isGroupPassword(pass) ? { username: account.u, member, needsPassword: true } : null;
}

/** Tự đăng ký: { username, name, mật khẩu nhóm, mật khẩu riêng }.
    Trả { ok, session } hoặc { ok: false, error }. */
export async function signup(username, name, groupPass, ownPass) {
  const u = normUser(username);
  const display = normName(name);

  if (!isGroupPassword(groupPass)) return { ok: false, error: "Sai mật khẩu nhóm — hỏi chủ kèo nhé." };
  // Không cho dấu chấm: cookie phiên là "<username>.<hạn>.<chữ ký>", tách theo dấu chấm.
  if (!/^[a-z0-9_-]{3,20}$/.test(u)) {
    return { ok: false, error: "Tên đăng nhập 3–20 ký tự, chỉ chữ thường không dấu, số, dấu _ hoặc -" };
  }
  if (display.length < 2 || display.length > 30) return { ok: false, error: "Tên hiển thị 2–30 ký tự." };
  const weak = weakPassword(ownPass);
  if (weak) return { ok: false, error: weak };

  if (await accountByUsername(u)) return { ok: false, error: "Tên đăng nhập này có người dùng rồi." };

  // Tên hiển thị không được trùng người đã có tài khoản, không thì danh sách đi có hai "Bean".
  const taken = new Set(accounts().map((a) => a.m));
  const others = await signupAccounts();
  for (const a of others) taken.add(a.m);
  const members = getHub().members || [];
  const sameName = members.find((m) => fold(m.name) === fold(display));

  let m;
  if (sameName && !taken.has(sameName.id)) {
    m = sameName.id; // thành viên có sẵn nhưng chưa có tài khoản -> nhận đúng người
  } else if (sameName || others.some((a) => fold(a.name) === fold(display) || fold(a.m) === fold(display))) {
    return { ok: false, error: "Tên này đã có tài khoản — đăng nhập bằng tài khoản đó, hoặc thêm họ/biệt danh cho khác đi." };
  } else {
    m = display;
  }

  const account = { u, m, name: display, at: new Date().toISOString() };
  const kv = getKv();
  if (kv) {
    // hsetnx: hai người bấm cùng lúc một username thì chỉ một người được.
    const created = await kv.hsetnx(SIGNUP_KEY, u, JSON.stringify(account));
    if (!created) return { ok: false, error: "Tên đăng nhập này có người dùng rồi." };
  } else {
    signupMemory.set(u, account);
  }
  await savePassword(u, ownPass);

  return { ok: true, session: { username: u, member: memberOf(account), needsPassword: false } };
}

/** Đặt / đổi mật khẩu riêng của người đang đăng nhập.
    Đã có mật khẩu riêng thì phải nhập đúng mật khẩu hiện tại. */
export async function changePassword(session, current, next) {
  if (!session) return { ok: false, error: "Đăng nhập trước đã." };
  const rec = await passwordRecord(session.username);
  if (rec && !checkPassword(rec, current)) return { ok: false, error: "Mật khẩu hiện tại không đúng." };
  const weak = weakPassword(next);
  if (weak) return { ok: false, error: weak };
  await savePassword(session.username, next);
  return { ok: true, session: { ...session, needsPassword: false } };
}

/* ---------------- cookie phiên ---------------- */

const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

/** Chuỗi bỏ vào cookie: "<username>.<hạn>.<chữ ký>". */
export function signSession(username) {
  const until = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `${username}.${until}`;
  return `${body}.${sign(body)}`;
}

/** Đọc cookie -> { username, member, needsPassword }, hỏng hoặc hết hạn thì null. */
export async function readSession(raw) {
  const parts = String(raw || "").split(".");
  if (parts.length !== 3) return null;
  const [username, until, mac] = parts;
  if (!sameString(mac, sign(`${username}.${until}`))) return null;
  if (!Number(until) || Number(until) * 1000 < Date.now()) return null;

  const account = await accountByUsername(username);
  const member = memberOf(account);
  if (!member) return null;

  const rec = await passwordRecord(account.u);
  // Cookie cấp trước lúc đặt/đổi mật khẩu thì bỏ — ai vào hộ bằng mật khẩu nhóm bị đá ra.
  const issued = Number(until) - MAX_AGE;
  if (rec && issued < Math.floor(rec.at / 1000)) return null;

  return { username: account.u, member, needsPassword: !rec };
}

/** Danh tính của một request, đọc từ cookie. Dùng ở route API (nhớ await). */
export const sessionFrom = (req) => readSession(req.cookies.get(COOKIE)?.value);

/** Đặt cookie phiên lên response sau khi đăng nhập / đăng ký / đổi mật khẩu. */
export function setSessionCookie(res, username) {
  res.cookies.set(COOKIE, signSession(username), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** Dạng gửi về client — không bao giờ kèm gì về mật khẩu ngoài cờ needsPassword. */
export const publicUser = (s) => ({
  username: s.username,
  memberId: s.member.id,
  name: s.member.short || s.member.name,
  needsPassword: !!s.needsPassword,
});

export const COOKIE_NAME = COOKIE;
export const COOKIE_MAX_AGE = MAX_AGE;
