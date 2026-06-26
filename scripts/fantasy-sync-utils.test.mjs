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

test("sums the lineup even when a starter is missing from players.json (no FIFA fallback)", () => {
  // Cầu thủ 99 không có trong players.json -> tính 0 điểm, KHÔNG kéo cả vòng về số FIFA (roundPoints: 1).
  const fantasy = sync(team({ lineup: { GK: [], DEF: [], MID: [2, 99], FWD: [1] } }));

  assert.equal(fantasy.standings[0].roundPoints, 13);
  assert.equal(fantasy.standings[0].rounds.g1, 13);
});
