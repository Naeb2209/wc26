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

function normalizeName(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đð]/gi, "d")
    .replace(/[øö]/gi, "o")
    .replace(/[ł]/gi, "l")
    .replace(/[æ]/gi, "ae")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function buildLocalPlayersByTeam(teams) {
  return new Map(
    (teams || []).map((team) => [
      team.code,
      (team.players || [])
        .filter((player) => player.avatar)
        .map((player) => ({ ...player, normalizedName: normalizeName(player.name) })),
    ])
  );
}

function playerAvatar(player, squad, localPlayersByTeam) {
  const direct = player?.avatar || player?.image || player?.photo || player?.picture;
  if (direct) return direct;

  const localPlayers = localPlayersByTeam.get(squad?.abbr) || [];
  const fullName = [player?.firstName, player?.lastName].filter(Boolean).join(" ");
  const aliases = [player?.knownName, fullName].map(normalizeName).filter(Boolean);
  const exact = localPlayers.find((local) => aliases.includes(local.normalizedName));
  if (exact) return exact.avatar;

  const lastName = normalizeName(player?.lastName);
  if (!lastName) return "";
  const surnameMatches = localPlayers.filter(
    (local) => local.normalizedName === lastName || local.normalizedName.endsWith(` ${lastName}`)
  );
  return surnameMatches.length === 1 ? surnameMatches[0].avatar : "";
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

function calculatedTeamRoundPoints(team, roundId, playersById) {
  if (!team?.id) return null;

  const starterIds = flattenPositionMap(team.lineup).map(({ playerId }) => playerId);
  const twelfthManId =
    Number(team?.twelfthMan?.roundId) === Number(roundId)
      ? Number(team.twelfthMan?.playerId)
      : 0;
  if (twelfthManId && !starterIds.includes(twelfthManId)) starterIds.push(twelfthManId);
  // Tổng điểm HLV = điểm các cầu thủ ĐÁ CHÍNH (lineup + 12th Man) cộng lại, đội trưởng x2 —
  // KHÔNG tính dự bị, và KHÔNG dùng số tổng FIFA báo về. Chỉ bỏ qua khi không có đội hình.
  if (!starterIds.length) return null;

  const maxCaptainId =
    Number(team.maxCaptain) === Number(roundId)
      ? Number(team.maxCaptainBooster?.playerId)
      : 0;
  const captainId = maxCaptainId || Number(team.captain);

  // Cầu thủ thiếu trong players.json -> tính 0 điểm (không kéo cả vòng về số FIFA).
  return starterIds.reduce((total, playerId) => {
    const points = playerRoundPoints(playersById.get(playerId), roundId);
    return total + points * (playerId === captainId ? 2 : 1);
  }, 0);
}

export function normalizeFantasySquad({ team, round, playersById, squadsById, localPlayersByTeam = new Map(), playerStatsById = new Map() }) {
  if (!team?.id) return null;

  const makePlayer = ({ playerId, position }) => {
    const player = playersById.get(Number(playerId));
    if (!player) return null;
    const squad = squadsById.get(Number(player.squadId));
    const rawPoints = playerRoundPoints(player, round.id);
    const isMaxCaptain =
      Number(team.maxCaptain) === Number(round.id) &&
      Number(team.maxCaptainBooster?.playerId) === Number(player.id);
    const hasMaxCaptain = Number(team.maxCaptain) === Number(round.id);
    const isCaptain = Number(team.captain) === Number(player.id);
    const points = isMaxCaptain || (!hasMaxCaptain && isCaptain) ? rawPoints * 2 : rawPoints;

    // Chỉ số THẬT của FIFA cho cầu thủ này ở vòng này (player_stats/<id>.json).
    const fifaArr = playerStatsById.get(Number(player.id)) || [];
    const fifaEntry = fifaArr.find((e) => Number(e.roundId) === Number(round.id)) || null;
    const s = fifaEntry?.stats || {};
    const hasFifa = !!fifaEntry;
    const num = (v) => Number(v || 0);

    const fx = fixtureFor(round, Number(player.squadId), squadsById);
    const minutes = hasFifa ? num(s.MP) : fx.minutes;
    const played = hasFifa ? num(s.MP) > 0 : fx.played;

    return {
      id: Number(player.id),
      name: playerName(player),
      avatar: playerAvatar(player, squad, localPlayersByTeam),
      teamCode: squad?.abbr || "",
      teamName: squad?.name || "",
      crest: "",
      bucket: player.position || position,
      price: Number(player.price || 0),
      points,
      rawPoints,
      // FIFA stats (khớp với điểm); thiếu FIFA -> 0/null như cũ.
      goals: hasFifa ? num(s.GS) : 0,
      assists: hasFifa ? num(s.AS) : 0,
      saves: hasFifa ? num(s.S) : 0,
      tackles: hasFifa ? num(s.T) : null,
      sot: hasFifa ? num(s.ST) : null,
      chancesCreated: hasFifa ? num(s.CC) : null,
      cleanSheet: hasFifa ? num(s.CS) : 0,
      conceded: hasFifa ? num(s.GC) : 0,
      yellow: hasFifa ? num(s.YC) : 0,
      red: hasFifa ? num(s.RC) : 0,
      xG: 0,
      xA: 0,
      // Breakdown FIFA cho modal (điểm + toàn bộ stat thô).
      fifa: hasFifa ? { points: num(fifaEntry.points), stats: s } : null,
      ...fx,
      minutes,
      played,
      isCaptain,
      isVice: Number(team.vice) === Number(player.id),
      isMaxCaptain,
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

export function mergeFantasySync({ db, ranks, roundRankings, histories, rounds, players, squads, playerStats, leagueId }) {
  db.fantasy ||= {};
  const oldRank = new Map((db.fantasy.standings || []).map((standing) => [standing.manager, standing.rank]));
  const oldStanding = new Map((db.fantasy.standings || []).map((standing) => [standing.manager, standing]));
  const playersById = new Map((players || []).map((player) => [Number(player.id), player]));
  const squadsById = new Map((squads || []).map((squad) => [Number(squad.id), squad]));
  const playerStatsById = new Map(Object.entries(playerStats || {}).map(([id, arr]) => [Number(id), arr]));
  const localPlayersByTeam = buildLocalPlayersByTeam(db.teams);
  const roundsById = new Map((rounds || []).map((round) => [Number(round.id), round]));
  const rankingByRound = new Map(
    Object.entries(roundRankings || {}).map(([roundId, rows]) => [
      Number(roundId),
      new Map((rows || []).map((row) => [Number(row.userId), row])),
    ])
  );

  const syncedStandings = (ranks || []).map((rank, index) => {
    const userId = Number(rank.userId);
    const manager = rank.userName || `User ${userId}`;
    const previous = oldStanding.get(manager) || {};
    const roundPoints = { ...(previous.rounds || {}) };
    const chips = { ...(previous.chips || {}) };

    for (const item of FANTASY_ROUNDS) {
      const row = rankingByRound.get(item.id)?.get(userId);
      const historyTeam = histories?.[item.id]?.[userId]?.team;
      const calculatedPoints = calculatedTeamRoundPoints(historyTeam, item.id, playersById);
      if (calculatedPoints != null) {
        roundPoints[item.key] = calculatedPoints;
      } else if (historyTeam?.roundPoints != null) {
        roundPoints[item.key] = Number(historyTeam.roundPoints);
      } else if (row) {
        roundPoints[item.key] = Number(row.points ?? row.roundPoints ?? 0);
      }
      const booster = boosterFor(historyTeam, item.id);
      if (booster) chips[item.key] = booster;
    }

    const currentRound = [...FANTASY_ROUNDS]
      .reverse()
      .find((item) => rankingByRound.get(item.id)?.has(userId));
    const currentRoundPoints = currentRound
      ? roundPoints[currentRound.key]
      : Number(rank.roundPoints ?? 0);
    const syncedRoundKeys = FANTASY_ROUNDS
      .filter((item) => roundPoints[item.key] != null)
      .map((item) => item.key);
    const totalPoints = syncedRoundKeys.length
      ? syncedRoundKeys.reduce((total, key) => total + Number(roundPoints[key] || 0), 0)
      : Number(rank.overallPoints ?? rank.total ?? previous.totalPoints ?? previous.total ?? 0);

    return {
      userId,
      rank: rank.overallRank ?? index + 1,
      roundRank: rank.roundRank ?? index + 1,
      manager,
      team: "",
      rounds: roundPoints,
      chips,
      roundPoints: Number(currentRoundPoints ?? 0),
      totalPoints,
      gw: Number(currentRoundPoints ?? 0),
      total: totalPoints,
      prev: rank.overallRankPrevious ?? oldRank.get(manager) ?? null,
      avatar: rank.avatar || "",
    };
  });
  const roundRankByUser = new Map(
    [...syncedStandings]
      .sort((a, b) => b.roundPoints - a.roundPoints || a.rank - b.rank)
      .map((standing, index) => [standing.userId, index + 1])
  );
  const standings = [...syncedStandings]
    .sort((a, b) => b.totalPoints - a.totalPoints || a.rank - b.rank)
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
      roundRank: roundRankByUser.get(standing.userId) ?? standing.roundRank,
    }));

  const squadsByRound = {};
  for (const item of FANTASY_ROUNDS) {
    const round = roundsById.get(item.id);
    if (!round) continue;
    const byManager = {};
    for (const standing of standings) {
      const raw = histories?.[item.id]?.[standing.userId]?.team;
      const squad = normalizeFantasySquad({ team: raw, round, playersById, squadsById, localPlayersByTeam, playerStatsById });
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
  db.fantasy.summary = {
    roundWinner: [...standings].sort((a, b) => b.roundPoints - a.roundPoints)[0] || null,
    seasonLeader: [...standings].sort((a, b) => b.totalPoints - a.totalPoints)[0] || null,
    roundBottom: [...standings].sort((a, b) => a.roundPoints - b.roundPoints)[0] || null,
  };
  db.fantasy.updatedRound = `Cập nhật ${new Date().toLocaleString("vi-VN")}`;
  return db;
}
