// Sinh đội hình Fantasy (mock) cho mỗi manager từ pool cầu thủ thật trong db.json.
// Deterministic (không dùng Math.random/Date) để build/resume ổn định: cùng manager -> cùng đội hình.
// Đội hình 5-3-2: 11 đá chính (1 TM, 5 HV, 3 TV, 2 TĐ) + 4 dự bị (mỗi tuyến 1).

const POS = { GK: "Thủ Môn", DEF: "Hậu Vệ", MID: "Tiền Vệ", FWD: "Tiền Đạo" };

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PRICE_RANGE = { GK: [4.5, 5.5], DEF: [4.0, 6.5], MID: [5.5, 9.5], FWD: [6.5, 12.5] };
function priceFor(bucket, seed) {
  const [lo, hi] = PRICE_RANGE[bucket];
  const steps = Math.round((hi - lo) / 0.5);
  return Number((lo + 0.5 * (seed % (steps + 1))).toFixed(1));
}
const pointsFor = (seed) => seed % 16; // 0..15

// Thống kê (mock) theo tuyến — TĐ/TV ghi bàn & kiến tạo nhiều hơn TM/HV.
const GOAL_CAP = { GK: 1, DEF: 3, MID: 6, FWD: 9 };
const ASSIST_CAP = { GK: 1, DEF: 3, MID: 7, FWD: 5 };
function statsFor(bucket, seed) {
  const goals = seed % (GOAL_CAP[bucket] + 1);
  const assists = (seed >> 4) % (ASSIST_CAP[bucket] + 1);
  // xG / xA dao động quanh số thật, lệch ±0.0–0.9 (deterministic).
  const xG = Number((goals + ((seed >> 8) % 10) / 10).toFixed(1));
  const xA = Number((assists + ((seed >> 12) % 10) / 10).toFixed(1));
  // Thủ môn: số pha cứu thua (0..8).
  const saves = bucket === "GK" ? (seed >> 16) % 9 : 0;
  return { goals, assists, xG, xA, saves };
}

// Trận sắp tới (mock): đã đá hay chưa, gặp đội nào, ngày nào.
function fixtureFor(teamList, teamCode, seed) {
  const others = teamList.filter((t) => t.code !== teamCode);
  const opp = others.length ? others[(seed >> 20) % others.length] : null;
  const day = 11 + (seed % 18); // 11..28 tháng 6
  const played = seed % 4 !== 0; // ~25% chưa đá
  return {
    played,
    minutes: played ? 1 + ((seed >> 24) % 90) : 0, // 1..90'
    oppCode: opp?.code || "",
    oppName: opp?.name || "",
    oppCrest: opp?.crest || "",
    matchDate: `${String(day).padStart(2, "0")}/06`,
  };
}

function bucketOf(position) {
  if (position === POS.GK) return "GK";
  if (position === POS.DEF) return "DEF";
  if (position === POS.MID) return "MID";
  if (position === POS.FWD) return "FWD";
  return null;
}

export function buildSquads(standings = [], teams = []) {
  // Pool cầu thủ theo tuyến
  const buckets = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const t of teams) {
    for (const pl of t.players || []) {
      const b = bucketOf(pl.position);
      if (!b || !pl.name) continue;
      buckets[b].push({
        name: pl.name,
        avatar: pl.avatar || "",
        teamCode: t.code,
        teamName: t.name,
        crest: t.flag || "",
      });
    }
  }

  // Danh sách đội để bốc đối thủ cho lịch thi đấu.
  const teamList = teams.filter((t) => t.code && t.name).map((t) => ({ code: t.code, name: t.name, crest: t.flag || "" }));

  const squads = {};
  standings.forEach((m, mi) => {
    const used = new Set();
    const seed0 = hash(m.manager || `m${mi}`);
    const pick = (bucket, n) => {
      const arr = buckets[bucket];
      const out = [];
      if (!arr.length) return out;
      let idx = (seed0 + mi * 13 + bucket.length * 7) % arr.length;
      let guard = 0;
      while (out.length < n && guard < arr.length * 2) {
        const p = arr[idx % arr.length];
        const key = `${p.teamCode}:${p.name}`;
        if (!used.has(key)) {
          used.add(key);
          const seed = hash(key + mi);
          out.push({
            ...p,
            bucket,
            price: priceFor(bucket, seed),
            points: pointsFor(seed),
            ...statsFor(bucket, seed),
            ...fixtureFor(teamList, p.teamCode, seed),
          });
        }
        idx += 7;
        guard++;
      }
      return out;
    };

    const starters = [...pick("GK", 1), ...pick("DEF", 5), ...pick("MID", 3), ...pick("FWD", 2)];
    const bench = [...pick("GK", 1), ...pick("DEF", 1), ...pick("MID", 1), ...pick("FWD", 1)];

    // Đội trưởng = cầu thủ đá chính (ngoài TM) nhiều điểm nhất; phó = kế tiếp.
    const ranked = starters.filter((p) => p.bucket !== "GK").slice().sort((a, b) => b.points - a.points);
    const capKey = ranked[0] && `${ranked[0].teamCode}:${ranked[0].name}`;
    const viceKey = ranked[1] && `${ranked[1].teamCode}:${ranked[1].name}`;
    for (const p of starters) {
      const k = `${p.teamCode}:${p.name}`;
      p.isCaptain = k === capKey;
      p.isVice = k === viceKey;
    }

    const squadValue = [...starters, ...bench].reduce((s, p) => s + p.price, 0);
    squads[m.manager] = { formation: "5-3-2", starters, bench, squadValue: Number(squadValue.toFixed(1)) };
  });

  return squads;
}
