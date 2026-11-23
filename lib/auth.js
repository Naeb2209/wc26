import { createHmac, timingSafeEqual } from "node:crypto";
import { getHub, memberById } from "./dc42";
import { getKv } from "./kv";

/* Đăng nhập tối giản cho DC42 Hub.

   Chưa nối SSO nên dùng tài khoản khai sẵn trong data: mỗi dòng accounts[] buộc một
   username với một memberId. Mật khẩu dùng chung, lấy từ biến môi trường DC42_PASSWORD
   (mặc định "123") — đây là rào chắn kiểu nội bộ, chỉ để không ai điểm danh thay người
   khác chỉ bằng một cú chọn tên, KHÔNG phải cơ chế bảo mật thật.

   Phiên lưu trong cookie httpOnly có chữ ký HMAC, nên client không tự sửa được memberId.
   Khi có SSO thật thì thay hai hàm signSession/readSession là đủ. */

const COOKIE = "dc42_session";
const MAX_AGE = 30 * 24 * 3600; // 30 ngày

const password = () => process.env.DC42_PASSWORD || "123";
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
const signupMemory = (globalThis.__dc42Accounts ??= new Map());

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

const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

const sameString = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Đúng username + mật khẩu -> trả về member tương ứng, sai thì null. */
export async function login(username, pass) {
  if (!sameString(pass ?? "", password())) return null;
  const account = await accountByUsername(username);
  const member = memberOf(account);
  return member ? { username: account.u, member } : null;
}

/** Tự đăng ký: { username, name, password nhóm }. Trả { ok, session } hoặc { ok: false, error }.
    Mật khẩu vẫn là mật khẩu chung của nhóm — người ngoài không biết thì không tạo được tài khoản. */
export async function signup(username, name, pass) {
  const u = normUser(username);
  const display = normName(name);

  if (!sameString(pass ?? "", password())) return { ok: false, error: "Sai mật khẩu nhóm — hỏi chủ kèo nhé." };
  // Không cho dấu chấm: cookie phiên là "<username>.<hạn>.<chữ ký>", tách theo dấu chấm.
  if (!/^[a-z0-9_-]{3,20}$/.test(u)) {
    return { ok: false, error: "Tên đăng nhập 3–20 ký tự, chỉ chữ thường không dấu, số, dấu _ hoặc -" };
  }
  if (display.length < 2 || display.length > 30) return { ok: false, error: "Tên hiển thị 2–30 ký tự." };

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

  return { ok: true, session: { username: u, member: memberOf(account) } };
}

/** Chuỗi bỏ vào cookie: "<username>.<hạn>.<chữ ký>". */
export function signSession(username) {
  const until = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `${username}.${until}`;
  return `${body}.${sign(body)}`;
}

/** Đọc cookie -> member đang đăng nhập, hỏng hoặc hết hạn thì null. */
export async function readSession(raw) {
  const parts = String(raw || "").split(".");
  if (parts.length !== 3) return null;
  const [username, until, mac] = parts;
  if (!sameString(mac, sign(`${username}.${until}`))) return null;
  if (!Number(until) || Number(until) * 1000 < Date.now()) return null;

  const account = await accountByUsername(username);
  const member = memberOf(account);
  return member ? { username: account.u, member } : null;
}

/** Danh tính của một request, đọc từ cookie. Dùng ở route API (nhớ await). */
export const sessionFrom = (req) => readSession(req.cookies.get(COOKIE)?.value);

/** Đặt cookie phiên lên response sau khi đăng nhập / đăng ký thành công. */
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

export const COOKIE_NAME = COOKIE;
export const COOKIE_MAX_AGE = MAX_AGE;
