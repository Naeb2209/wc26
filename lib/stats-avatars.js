// Gắn avatar cầu thủ đã cấu hình trong db.json (teams[].players[].avatar) vào bảng playerStats.
// Khớp theo mã đội + tên (chuẩn hoá bỏ dấu); nếu không có avatar cấu hình thì để trống
// để giao diện hiện icon người gradient giống bên đội hình.

function norm(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s) {
  return new Set(norm(s).split(" ").filter(Boolean));
}

function subset(a, b) {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// Tạo hàm tra cứu avatar cấu hình theo (mã đội, tên cầu thủ) từ teams[].players[].avatar.
// Tên nguồn (FotMob/FIFA) có thể lệch tên trong db (thiếu/thừa tên đệm). Ưu tiên khớp đúng
// tuyệt đối, sau đó khớp tập con token (chỉ nhận khi duy nhất một ứng viên) để tránh gán nhầm.
// Trả về "" nếu không khớp.
export function buildAvatarLookup(teams = []) {
  const byTeam = new Map();
  for (const t of teams || []) {
    const arr = [];
    for (const p of t.players || []) {
      if (!p.name || !p.avatar) continue;
      arr.push({ n: norm(p.name), tk: tokens(p.name), avatar: p.avatar });
    }
    byTeam.set(t.code, arr);
  }

  return (code, name) => {
    const arr = byTeam.get(code);
    if (!arr || !arr.length) return "";
    const n = norm(name);
    const exact = arr.find((p) => p.n === n);
    if (exact) return exact.avatar;
    const tk = tokens(name);
    const cand = arr.filter((p) => subset(tk, p.tk) || subset(p.tk, tk));
    return cand.length === 1 ? cand[0].avatar : "";
  };
}

// Trả về playerStats mới với row.avatar = avatar cấu hình (hoặc "" nếu không khớp).
export function applyConfiguredAvatars(playerStats, teams = []) {
  if (!playerStats || !Array.isArray(playerStats.groups)) return playerStats;

  const lookup = buildAvatarLookup(teams);

  const groups = playerStats.groups.map((g) => ({
    ...g,
    categories: (g.categories || []).map((c) => ({
      ...c,
      rows: (c.rows || []).map((r) => ({ ...r, avatar: lookup(r.teamCode, r.player) })),
    })),
  }));

  return { ...playerStats, groups };
}
