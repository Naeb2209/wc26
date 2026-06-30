import assert from "node:assert/strict";
import test from "node:test";

import { mergeFantasySync } from "./fantasy-sync-utils.mjs";

function player(id, roundPoints) {
  return {
    id,
    squadId: 1,
    position: id === 1 ? "FWD" : "MID",
    stats: { roundPoints: { 1: roundPoints } },
  };
}

function team(overrides = {}) {
  return {
    id: 10,
    captain: 1,
    lineup: { GK: [], DEF: [], MID: [2], FWD: [1] },
    bench: {},
    benchOrder: [],
    roundPoints: 1,
    overallPoints: 1,
    ...overrides,
  };
}

function sync(historyTeam, players = [player(1, 5), player(2, 3)]) {
  const db = { teams: [], fantasy: { standings: [] } };
  mergeFantasySync({
    db,
    ranks: [{ userId: 7, userName: "Coach", roundPoints: 1, overallPoints: 1 }],
    roundRankings: { 1: [{ userId: 7, points: 1 }] },
    histories: { 1: { 7: { team: historyTeam } } },
    rounds: [{ id: 1, status: "complete", tournaments: [] }],
    players,
    squads: [{ id: 1, abbr: "TST", name: "Test" }],
    leagueId: 1090,
  });
  return db.fantasy;
}

test("recalculates coach round and total points from synced player points", () => {
  const fantasy = sync(team());

  assert.equal(fantasy.standings[0].roundPoints, 13);
  assert.equal(fantasy.standings[0].totalPoints, 13);
  assert.equal(fantasy.standings[0].rounds.g1, 13);
  assert.equal(fantasy.squadsByRound.g1.Coach.starters.find((p) => p.id === 1).points, 10);
});

test("uses maximum captain instead of the regular captain", () => {
  const fantasy = sync(
    team({
      maxCaptain: 1,
      maxCaptainBooster: { playerId: 2 },
    })
  );

  assert.equal(fantasy.standings[0].roundPoints, 11);
  assert.equal(fantasy.squadsByRound.g1.Coach.starters.find((p) => p.id === 1).points, 5);
  assert.equal(fantasy.squadsByRound.g1.Coach.starters.find((p) => p.id === 2).points, 6);
});

test("doubles the regular captain after maximum captain was used in an earlier round", () => {
  const fantasy = sync(team({ maxCaptain: 2 }));

  assert.equal(fantasy.standings[0].roundPoints, 13);
  assert.equal(fantasy.squadsByRound.g1.Coach.starters.find((p) => p.id === 1).points, 10);
});

test("keeps transfer fee out of round points but deducts it from the total", () => {
  // negativeTransfers = phí chuyển nhượng vượt mức của vòng. Điểm vòng GIỮ NGUYÊN (13),
  // chỉ điểm tổng bị trừ (13 - 4 = 9).
  const fantasy = sync(team({ negativeTransfers: 4 }));

  assert.equal(fantasy.standings[0].roundPoints, 13);
  assert.equal(fantasy.standings[0].rounds.g1, 13);
  assert.equal(fantasy.standings[0].totalPoints, 9);
});

test("adds the 12th man to the lineup only in the round the booster was used", () => {
  const players = [player(1, 5), player(2, 3), player(3, 4)];

  // Booster dùng ĐÚNG vòng này (roundId 1) -> cầu thủ 3 được gắn cờ + nhồi vào đội hình.
  const used = sync(team({ twelfthMan: { playerId: 3, roundId: 1 } }), players);
  const usedStarters = used.squadsByRound.g1.Coach.starters;
  assert.equal(usedStarters.length, 3);
  assert.equal(usedStarters.find((p) => p.id === 3)?.isTwelfthMan, true);

  // Booster đã dùng ở vòng KHÁC (roundId 2) nhưng bản ghi vẫn còn ở vòng 1 ->
  // KHÔNG gắn cờ, KHÔNG nhồi cầu thủ 3 vào đội hình vòng 1 (tránh cầu thủ thứ 12 sai).
  const stale = sync(team({ twelfthMan: { playerId: 3, roundId: 2 } }), players);
  const staleStarters = stale.squadsByRound.g1.Coach.starters;
  assert.equal(staleStarters.length, 2);
  assert.ok(!staleStarters.some((p) => p.id === 3));
  assert.ok(staleStarters.every((p) => p.isTwelfthMan === false));
});

test("qualification booster adds +2 per starter who played and advanced (captain not doubled)", () => {
  // Vòng knock-out (r32 = id 4). Cầu thủ 1 (đội trưởng, squad 1) và 2 (squad 2).
  const players = [
    { id: 1, squadId: 1, position: "FWD", stats: { roundPoints: { 4: 5 } } },
    { id: 2, squadId: 2, position: "MID", stats: { roundPoints: { 4: 3 } } },
  ];
  const db = { teams: [], fantasy: { standings: [] } };
  mergeFantasySync({
    db,
    ranks: [{ userId: 7, userName: "Coach", roundPoints: 1, overallPoints: 1 }],
    roundRankings: { 4: [{ userId: 7, points: 1 }] },
    histories: {
      4: {
        7: {
          team: {
            id: 10,
            captain: 1,
            qualification: 4, // booster dùng ở vòng này
            lineup: { GK: [], DEF: [], MID: [2], FWD: [1] },
            bench: {},
            benchOrder: [],
          },
        },
      },
    },
    // squad 1 THẮNG trận r32 (2-0) -> đi tiếp. squad 2 THUA (0-1) -> bị loại.
    rounds: [
      {
        id: 4,
        status: "complete",
        tournaments: [
          { homeSquadId: 1, awaySquadId: 9, homeScore: 2, awayScore: 0, status: "complete" },
          { homeSquadId: 2, awaySquadId: 8, homeScore: 0, awayScore: 1, status: "complete" },
        ],
      },
    ],
    players,
    squads: [{ id: 1, abbr: "AAA", name: "A" }, { id: 2, abbr: "BBB", name: "B" }],
    playerStats: {
      1: [{ roundId: 4, points: 5, stats: { MP: 90 } }],
      2: [{ roundId: 4, points: 3, stats: { MP: 90 } }],
    },
    leagueId: 1090,
  });

  // Cầu thủ 1: 5*2 (đội trưởng) + 2 (đi tiếp, KHÔNG nhân đôi) = 12.
  // Cầu thủ 2: 3 + 0 (bị loại) = 3.  Tổng = 15.
  assert.equal(db.fantasy.standings[0].rounds.r32, 15);
  const starters = db.fantasy.squadsByRound.r32.Coach.starters;
  assert.equal(starters.find((p) => p.id === 1).points, 12);
  assert.equal(starters.find((p) => p.id === 1).qualBonus, 2);
  assert.equal(starters.find((p) => p.id === 2).points, 3);
  assert.equal(starters.find((p) => p.id === 2).qualBonus, 0);
});

// Sync 1 đội ở vòng knock-out r32 (id 4) với chỉ số FIFA thật (MP/GC) cho Clean Sheet Shield.
function syncR32({ teamOverrides = {}, players, playerStats }) {
  const db = { teams: [], fantasy: { standings: [] } };
  mergeFantasySync({
    db,
    ranks: [{ userId: 7, userName: "Coach", roundPoints: 1, overallPoints: 1 }],
    roundRankings: { 4: [{ userId: 7, points: 1 }] },
    histories: {
      4: {
        7: {
          team: {
            id: 10,
            captain: 1,
            lineup: { GK: [], DEF: [2], MID: [], FWD: [1] },
            bench: {},
            benchOrder: [],
            ...teamOverrides,
          },
        },
      },
    },
    rounds: [{ id: 4, status: "complete", tournaments: [] }],
    players,
    squads: [{ id: 1, abbr: "TST", name: "Test" }],
    playerStats,
    leagueId: 1090,
  });
  return db.fantasy;
}

const SHIELD_PLAYERS = [
  { id: 1, squadId: 1, position: "FWD", stats: { roundPoints: { 4: 5 } } },
  { id: 2, squadId: 1, position: "DEF", stats: { roundPoints: { 4: 2 } } },
];

test("clean sheet shield restores the clean sheet points for a defender who conceded exactly one", () => {
  const playerStats = {
    1: [{ roundId: 4, points: 5, stats: { MP: 90, GC: 0 } }],
    2: [{ roundId: 4, points: 2, stats: { MP: 120, GC: 1 } }],
  };

  // Chip bật: hậu vệ 2 thủng đúng 1 trái -> +5 sạch lưới (2 -> 7). Đội trưởng 1 (FWD) không liên quan.
  const on = syncR32({ teamOverrides: { cleanSheet: 4 }, players: SHIELD_PLAYERS, playerStats });
  const onDef = on.squadsByRound.r32.Coach.starters.find((p) => p.id === 2);
  assert.equal(onDef.points, 7);
  assert.equal(onDef.csBonus, 5);
  assert.equal(on.standings[0].rounds.r32, 17); // 5*2 (đội trưởng FWD) + 7

  // Chip tắt: không cộng bù, hậu vệ vẫn mất sạch lưới.
  const off = syncR32({ players: SHIELD_PLAYERS, playerStats });
  const offDef = off.squadsByRound.r32.Coach.starters.find((p) => p.id === 2);
  assert.equal(offDef.points, 2);
  assert.equal(offDef.csBonus, 0);
});

test("clean sheet shield ignores two goals conceded and doubles the restored points for a captain", () => {
  // Thủng 2 trái -> vẫn mất sạch lưới kể cả khi bật chip.
  const twoConceded = syncR32({
    teamOverrides: { cleanSheet: 4 },
    players: SHIELD_PLAYERS,
    playerStats: {
      1: [{ roundId: 4, points: 5, stats: { MP: 90, GC: 0 } }],
      2: [{ roundId: 4, points: 2, stats: { MP: 120, GC: 2 } }],
    },
  });
  assert.equal(twoConceded.squadsByRound.r32.Coach.starters.find((p) => p.id === 2).csBonus, 0);

  // Hậu vệ là đội trưởng -> điểm sạch lưới cộng vào điểm THÔ rồi mới nhân đôi: (2+5)*2 = 14.
  const capDef = syncR32({
    teamOverrides: { captain: 2, cleanSheet: 4 },
    players: SHIELD_PLAYERS,
    playerStats: {
      1: [{ roundId: 4, points: 5, stats: { MP: 90, GC: 0 } }],
      2: [{ roundId: 4, points: 2, stats: { MP: 120, GC: 1 } }],
    },
  });
  const cap = capDef.squadsByRound.r32.Coach.starters.find((p) => p.id === 2);
  assert.equal(cap.points, 14);
  assert.equal(cap.csBonus, 5);
});

test("clean sheet shield gives a midfielder +1 and skips players under 60 minutes", () => {
  // Tiền vệ thủng 1 trái, đá 60' -> +1. Đá <60' -> không có sạch lưới nên không cộng.
  const players = [
    { id: 1, squadId: 1, position: "FWD", stats: { roundPoints: { 4: 5 } } },
    { id: 2, squadId: 1, position: "MID", stats: { roundPoints: { 4: 3 } } },
  ];
  const playable = syncR32({
    teamOverrides: { cleanSheet: 4 },
    players,
    playerStats: {
      1: [{ roundId: 4, points: 5, stats: { MP: 90, GC: 0 } }],
      2: [{ roundId: 4, points: 3, stats: { MP: 60, GC: 1 } }],
    },
  });
  assert.equal(playable.squadsByRound.r32.Coach.starters.find((p) => p.id === 2).csBonus, 1);

  const benched = syncR32({
    teamOverrides: { cleanSheet: 4 },
    players,
    playerStats: {
      1: [{ roundId: 4, points: 5, stats: { MP: 90, GC: 0 } }],
      2: [{ roundId: 4, points: 3, stats: { MP: 45, GC: 1 } }],
    },
  });
  assert.equal(benched.squadsByRound.r32.Coach.starters.find((p) => p.id === 2).csBonus, 0);
});

test("sums the lineup even when a starter is missing from players.json (no FIFA fallback)", () => {
  // Cầu thủ 99 không có trong players.json -> tính 0 điểm, KHÔNG kéo cả vòng về số FIFA (roundPoints: 1).
  const fantasy = sync(team({ lineup: { GK: [], DEF: [], MID: [2, 99], FWD: [1] } }));

  assert.equal(fantasy.standings[0].roundPoints, 13);
  assert.equal(fantasy.standings[0].rounds.g1, 13);
});
