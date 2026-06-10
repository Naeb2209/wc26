import { NextResponse } from "next/server";
import { getStandings, getSchedule, providerOrder } from "@/lib/fifa-api";

export const dynamic = "force-dynamic";

const ENDPOINTS = {
  "football-data": {
    url: "https://api.football-data.org/v4/competitions/WC/standings",
    header: (k) => ({ "X-Auth-Token": k }),
    keyEnv: "FOOTBALL_DATA_TOKEN",
  },
  "api-football": {
    url: "https://v3.football.api-sports.io/standings?league=1&season=2026",
    header: (k) => ({ "x-apisports-key": k }),
    keyEnv: "API_FOOTBALL_KEY",
  },
};

async function ping(provider) {
  const cfg = ENDPOINTS[provider];
  const key = process.env[cfg.keyEnv];
  if (!key) return { provider, ok: false, status: 0, message: `thiếu ${cfg.keyEnv}` };
  try {
    const r = await fetch(cfg.url, { headers: cfg.header(key), cache: "no-store" });
    const h = r.headers;
    let quota;
    if (provider === "football-data") {
      quota = {
        conLaiTrongPhut: h.get("X-Requests-Available-Minute"),
        resetSauGiay: h.get("X-RequestCounter-Reset"),
      };
    } else {
      quota = {
        conLaiTrongNgay: h.get("x-ratelimit-requests-remaining"),
        gioiHanNgay: h.get("x-ratelimit-requests-limit"),
        conLaiTrongPhut: h.get("X-RateLimit-Remaining"),
      };
    }
    let message = "OK";
    if (!r.ok) {
      message = await r.text().then((t) => t.slice(0, 160)).catch(() => "");
    } else if (provider === "api-football") {
      const j = await r.json();
      const errs = j.errors;
      const n = Array.isArray(errs) ? errs.length : errs ? Object.keys(errs).length : 0;
      if (n) return { provider, ok: false, status: r.status, quota, message: `quota/errors ${JSON.stringify(errs).slice(0, 140)}` };
    }
    return { provider, ok: r.ok, status: r.status, quota, message };
  } catch (e) {
    return { provider, ok: false, status: 0, message: `mạng lỗi: ${e.message}` };
  }
}

export async function GET() {
  const order = providerOrder();
  const [standings, schedule, pings] = await Promise.all([
    getStandings(),
    getSchedule(),
    Promise.all(order.map(ping)),
  ]);
  const groupMatches = schedule.schedule?.["Vòng Bảng"]?.matches || {};
  const matchCount = Object.values(groupMatches).reduce((n, arr) => n + (arr?.length || 0), 0);

  return NextResponse.json({
    priorityOrder: order.length ? order : ["(chưa có key nào)"],
    activeSource: standings.source,
    pings,
    standings: { source: standings.source, groups: standings.groups.length },
    schedule: { source: schedule.source, groupMatches: matchCount },
    note:
      standings.source === "sample"
        ? "Đang dùng dữ liệu mẫu (mọi nguồn API đều lỗi hoặc chưa có key). Xem 'pings' để biết lý do từng nguồn, và nhớ khởi động lại server sau khi sửa .env.local."
        : `Đang lấy dữ liệu thật từ: ${standings.source}.`,
  });
}
