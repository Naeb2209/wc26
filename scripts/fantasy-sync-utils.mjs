export const FANTASY_ROUNDS = [
  { id: 1, key: "g1" },
  { id: 2, key: "g2" },
  { id: 3, key: "g3" },
  { id: 4, key: "r32" },
  { id: 5, key: "r16" },
  { id: 6, key: "qf" },
  { id: 7, key: "sf" },
  { id: 8, key: "f" },
];

const POSITION_ORDER = ["GK", "DEF", "MID", "FWD"];

function playerName(player) {
  return player?.knownName || [player?.firstName, player?.lastName].filter(Boolean).join(" ") || `Player ${player?.id}`;
}

function playerRoundPoints(player, roundId) {
  const points = player?.stats?.roundPoints;
  if (Array.isArray(points)) return Number(points[roundId] ?? points[roundId - 1] ?? 0);
  return Number(points?.[roundId] ?? 0);
}

function fixtureFor(round, squadId, squadsById) {
  const match = round?.tournaments?.find((item) => item.homeSquadId === squadId || item.awaySquadId === squadId);
  if (!match) {
    return { played: false, minutes: 0, oppCode: "", oppName: "", oppCrest: "", matchDate: "" };
  }

  const isHome = match.homeSquadId === squadId;
  const opponentId = isHome ? match.awaySquadId : match.homeSquadId;
  const opponent = squadsById.get(opponentId);
  const date = match.date ? new Date(match.date) : null;
  const played = ["active", "playing", "complete"].includes(match.status);

  return {
    played,
    minutes: played ? Number(match.minutes || 90) : 0,
    oppCode: opponent?.abbr || (isHome ? match.awaySquadAbbr : match.homeSquadAbbr) || "",
    oppName: opponent?.name || (isHome ? match.awaySquadName : match.homeSquadName) || "",
    oppCrest: "",
    matchDate:
      date && !Number.isNaN(date.valueOf())
        ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date)
        : "",
  };
}

function flattenPositionMap(value) {
  if (!value || typeof value !== "object") return [];
  return POSITION_ORDER.flatMap((position) =>
    (Array.isArray(value[position]) ? value[position] : [])
      .filter(Boolean)
      .map((playerId) => ({ playerId: Number(playerId), position }))
  );
}

function boosterFor(team, roundId) {
  if (Number(team?.maxCaptain) === roundId) return "Maximum Captain";
  if (Number(team?.wildCard) === roundId) return "Wildcard";
  if (Number(team?.twelfthMan?.roundId) === roundId) return "12th Man";
  if (Number(team?.qualification) === roundId) return "Qualification Booster";
  if (Number(team?.cleanSheet) === roundId) return "Mystery Booster";
  return null;
}

export function normalizeFantasySquad({ team, round, playersById, squadsById }) {
  if (!team?.id) return null;

  const makePlayer = ({ playerId, position }) => {
    const player = playersById.get(Number(playerId));
    if (!player) return null;
    const squad = squadsById.get(Number(player.squadId));
    const points = playerRoundPoints(player, round.id);

    return {
      id: Number(player.id),
      name: playerName(player),
      avatar: "",
      teamCode: squad?.abbr || "",
      teamName: squad?.name || "",
      crest: "",
      bucket: player.position || position,
      price: Number(player.price || 0),
      points,
      goals: 0,
      assists: 0,
      xG: 0,
      xA: 0,
      saves: 0,
      ...fixtureFor(round, Number(player.squadId), squadsById),
      isCaptain: Number(team.captain) === Number(player.id),
      isVice: Number(team.vice) === Number(player.id),
      isTwelfthMan: Number(team.twelfthMan?.playerId) === Number(player.id),
    };
  };

  const starters = flattenPositionMap(team.lineup).map(makePlayer).filter(Boolean);
  const benchMap = new Map(flattenPositionMap(team.bench).map((item) => [item.playerId, item]));
  const orderedBench = (team.benchOrder || [])
    .map((playerId) => benchMap.get(Number(playerId)))
    .filter(Boolean);
  for (const item of benchMap.values()) {
    if (!orderedBench.some((entry) => entry.playerId === item.playerId)) orderedBench.push(item);
  }
  const bench = orderedBench.map(makePlayer).filter(Boolean);

  if (team.twelfthMan?.playerId && !starters.some((player) => player.id === Number(team.twelfthMan.playerId))) {
    const extra = makePlayer({
      playerId: Number(team.twelfthMan.playerId),
      position: playersById.get(Number(team.twelfthMan.playerId))?.position || "FWD",
    });
    if (extra) starters.push(extra);
  }

  const counts = Object.fromEntries(POSITION_ORDER.map((position) => [position, starters.filter((p) => p.bucket === position).length]));
  const formation = `${counts.DEF || 0}-${counts.MID || 0}-${counts.FWD || 0}`;
  const squadValue = [...starters, ...bench].reduce((sum, player) => sum + Number(player.price || 0), 0);

  return {
    formation,
    starters,
    bench,
    squadValue: Number(squadValue.toFixed(1)),
    booster: boosterFor(team, round.id),
  };
}

export function mergeFantasySync({ db, ranks, roundRankings, histories, rounds, players, squads, leagueId }) {
  db.fantasy ||= {};
  const oldRank = new Map((db.fantasy.standings || []).map((standing) => [standing.manager, standing.rank]));
  const oldStanding = new Map((db.fantasy.standings || []).map((standing) => [standing.manager, standing]));
  const playersById = new Map((players || []).map((player) => [Number(player.id), player]));
  const squadsById = new Map((squads || []).map((squad) => [Number(squad.id), squad]));
  const roundsById = new Map((rounds || []).map((round) => [Number(round.id), round]));
  const rankingByRound = new Map(
    Object.entries(roundRankings || {}).map(([roundId, rows]) => [
      Number(roundId),
      new Map((rows || []).map((row) => [Number(row.userId), row])),
    ])
  );

  const standings = (ranks || []).map((rank, index) => {
    const userId = Number(rank.userId);
    const manager = rank.userName || `User ${userId}`;
    const previous = oldStanding.get(manager) || {};
    const roundPoints = { ...(previous.rounds || {}) };
    const chips = { ...(previous.chips || {}) };

    for (const item of FANTASY_ROUNDS) {
      const row = rankingByRound.get(item.id)?.get(userId);
      if (row) roundPoints[item.key] = Number(row.points ?? row.roundPoints ?? 0);
      const booster = boosterFor(histories?.[item.id]?.[userId]?.team, item.id);
      if (booster) chips[item.key] = booster;
    }

    return {
      userId,
      rank: rank.overallRank ?? index + 1,
      roundRank: rank.roundRank ?? index + 1,
      manager,
      team: "",
      rounds: roundPoints,
      chips,
      roundPoints: Number(rank.roundPoints ?? 0),
      totalPoints: Number(rank.overallPoints ?? rank.total ?? 0),
      gw: Number(rank.roundPoints ?? 0),
      total: Number(rank.overallPoints ?? rank.total ?? 0),
      prev: rank.overallRankPrevious ?? oldRank.get(manager) ?? null,
      avatar: rank.avatar || "",
    };
  });

  const squadsByRound = {};
  for (const item of FANTASY_ROUNDS) {
    const round = roundsById.get(item.id);
    if (!round) continue;
    const byManager = {};
    for (const standing of standings) {
      const raw = histories?.[item.id]?.[standing.userId]?.team;
      const squad = normalizeFantasySquad({ team: raw, round, playersById, squadsById });
      if (squad) byManager[standing.manager] = squad;
    }
    if (Object.keys(byManager).length) squadsByRound[item.key] = byManager;
  }

  db.fantasy.leagueId = Number(leagueId);
  db.fantasy.standings = standings;
  db.fantasy.squadsByRound = { ...(db.fantasy.squadsByRound || {}), ...squadsByRound };
  db.fantasy.rounds = FANTASY_ROUNDS.map((item) => ({
    ...item,
    status: roundsById.get(item.id)?.status || "scheduled",
  }));
  db.fantasy.updatedRound = `Cập nhật ${new Date().toLocaleString("vi-VN")}`;
  return db;
}
