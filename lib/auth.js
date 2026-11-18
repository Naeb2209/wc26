import { createHmac, timingSafeEqual } from "node:crypto";
import { getHub, memberById } from "./dc42";

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

export function accountByUsername(username) {
  const u = String(username || "").trim().toLowerCase();
  return accounts().find((a) => a.u === u) || null;
}

const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

const sameString = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Đúng username + mật khẩu -> trả về member tương ứng, sai thì null. */
export function login(username, pass) {
  const account = accountByUsername(username);
  if (!account || !sameString(pass ?? "", password())) return null;
  const member = memberById(account.m);
  return member ? { username: account.u, member } : null;
}

/** Chuỗi bỏ vào cookie: "<username>.<hạn>.<chữ ký>". */
export function signSession(username) {
  const until = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `${username}.${until}`;
  return `${body}.${sign(body)}`;
}

/** Đọc cookie -> member đang đăng nhập, hỏng hoặc hết hạn thì null. */
export function readSession(raw) {
  const parts = String(raw || "").split(".");
  if (parts.length !== 3) return null;
  const [username, until, mac] = parts;
  if (!sameString(mac, sign(`${username}.${until}`))) return null;
  if (!Number(until) || Number(until) * 1000 < Date.now()) return null;

  const account = accountByUsername(username);
  const member = account && memberById(account.m);
  return member ? { username: account.u, member } : null;
}

/** Danh tính của một request, đọc từ cookie. Dùng ở route API. */
export const sessionFrom = (req) => readSession(req.cookies.get(COOKIE)?.value);

export const COOKIE_NAME = COOKIE;
export const COOKIE_MAX_AGE = MAX_AGE;
