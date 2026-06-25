import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ghi lại đúng định dạng gốc của db.json: 2-space indent, CRLF, không newline cuối.
function serialize(obj) {
  return JSON.stringify(obj, null, 2).replace(/\n/g, "\r\n");
}

function clean(pos) {
  if (!pos) return null;
  const x = Number(pos.x) || 0;
  const y = Number(pos.y) || 0;
  const scale = Number(pos.scale) || 1;
  // Mặc định (0,0,1) -> coi như không cấu hình để giữ db.json gọn.
  if (x === 0 && y === 0 && scale === 1) return null;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, scale: Math.round(scale * 1000) / 1000 };
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  const { teamCode, name } = body || {};
  if (!teamCode || !name) {
    return NextResponse.json({ ok: false, error: "Thiếu teamCode hoặc name" }, { status: 400 });
  }

  const pos = clean(body.pos);

  let db;
  try {
    db = JSON.parse(await fs.readFile(DB_PATH, "utf8"));
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Không đọc được db.json: " + e.message }, { status: 500 });
  }

  const team = (db.teams || []).find((t) => t.code === teamCode);
  if (!team) return NextResponse.json({ ok: false, error: "Không tìm thấy đội " + teamCode }, { status: 404 });
  const player = (team.players || []).find((p) => p.name === name);
  if (!player) return NextResponse.json({ ok: false, error: "Không tìm thấy cầu thủ " + name }, { status: 404 });

  if (pos) player.avatarPos = pos;
  else delete player.avatarPos;

  try {
    await fs.writeFile(DB_PATH, serialize(db), "utf8");
  } catch (e) {
    // FS read-only (vd: Vercel) -> báo rõ.
    return NextResponse.json({ ok: false, error: "Không ghi được db.json: " + e.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teamCode, name, pos: pos || null });
}
