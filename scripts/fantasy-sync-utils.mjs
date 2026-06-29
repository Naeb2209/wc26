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
  if (Number(team?.cleanSheet) === roundId) return "Clean Sheet Shield";
  return null;
}

const num = (v) => Number(v || 0);

function squadIdsInRound(round) {
  const ids = new Set();
  for (const match of round?.tournaments || []) {
    if (match?.homeSquadId != null) ids.add(Number(match.homeSquadId));
    if (match?.awaySquadId != null) ids.add(Number(match.awaySquadId));
  }
  return ids;
}

// Đội vô địch trận chung kết (suy ra từ tỉ số FIFA nếu có, kể cả luân lưu).
// Không có tỉ số -> Set rỗng (thà KHÔNG cộng còn hơn cộng sai).
function finalWinnerSquadIds(round) {
  const ids = new Set();
  const match = (round?.tournaments || [])[0];
  if (!match) return ids;
  const home = Number(match.homeSquadId);
  const away = Number(match.awaySquadId);
  const hs = num(match.homeScore ?? match.homeGoals ?? match.scoreHome);
  const as = num(match.awayScore ?? match.awayGoals ?? match.scoreAway);
  const hp = num(match.homePenalties ?? match.homeShootoutScore);
  const ap = num(match.awayPenalties ?? match.awayShootoutScore);
  if (hs > as || (hs === as && hp > ap)) ids.add(home);
  else if (as > hs || (hs === as && ap > hp)) ids.add(away);
  return ids;
}

// Tập squadId ĐI TIẾP sau vòng knock-out roundId — dùng cho Qualification Booster.
// - Vòng 4..7 (r32→bán kết): đi tiếp = có mặt trong lịch thi đấu vòng kế tiếp.
// - Vòng 8 (chung kết): vô địch = thắng trận CK.
function advancedSquadIdsFor(roundId, roundsById) {
  const next = roundsById.get(Number(roundId) + 1);
  if (next) return squadIdsInRound(next);
  return finalWinnerSquadIds(roundsById.get(Number(roundId)));
}

// Cầu thủ có RA SÂN ở vòng này không (cần tối thiểu 1 phút cho Qualification Booster).
// Ưu tiên phút thật của FIFA (player_stats MP), thiếu thì suy từ trạng thái trận.
function playerPlayedInRound(player, roundId, round, squadsById, playerStatsById) {
  const arr = playerStatsById?.get(Number(player?.id)) || [];
  const entry = arr.find((e) => Number(e.roundId) === Number(roundId));
  if (entry) return num(entry.stats?.MP) > 0;
  return fixtureFor(round, Number(player?.squadId), squadsById).played;
}

// Qualification Booster: +2 cho mỗi cầu thủ đá chính ĐÃ RA SÂN và có đội ĐI TIẾP
// (hoặc vô địch CK). +2 KHÔNG nhân đôi cho đội trưởng. 0 nếu booster không bật vòng này.
function qualificationBonus({ player, roundId, qualActive, advancedSquadIds, round, squadsById, playerStatsById }) {
  if (!qualActive || !player || !advancedSquadIds?.has(Number(player.squadId))) return 0;
  return playerPlayedInRound(player, roundId, round, squadsById, playerStatsById) ? 2 : 0;
}

function calculatedTeamRoundPoints(team, roundId, playersById, ctx = {}) {
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
  const qualActive = Number(team?.qualification) === Number(roundId);
  const { round, squadsById, playerStatsById, advancedSquadIds } = ctx;

  // Cầu thủ thiếu trong players.json -> tính 0 điểm (không kéo cả vòng về số FIFA).
  // Điểm VÒNG = tổng điểm cầu thủ đá chính (đội trưởng x2) + bonus Qualification Booster,
  // KHÔNG trừ phí chuyển nhượng. Phí chuyển nhượng chỉ trừ vào ĐIỂM TỔNG (xem mergeFantasySync).
  return starterIds.reduce((total, playerId) => {
    const player = playersById.get(playerId);
    const base = playerRoundPoints(player, roundId) * (playerId === captainId ? 2 : 1);
    const bonus = qualificationBonus({
      player,
      roundId,
      qualActive,
      advancedSquadIds,
      round,
      squadsById,
      playerStatsById,
    });
    return total + base + bonus;
  }, 0);
}

// Phí chuyển nhượng vượt mức của vòng (negativeTransfers: số điểm bị trừ; Wildcard = 0).
// Vòng 1 không ai bị trừ vì là đội hình đầu. Chỉ trừ vào điểm tổng, không trừ vào điểm vòng.
function teamTransferFee(team) {
  return Number(team?.negativeTransfers || 0);
}

export function normalizeFantasySquad({ team, round, playersById, squadsById, localPlayersByTeam = new Map(), playerStatsById = new Map(), advancedSquadIds = new Set() }) {
  if (!team?.id) return null;

  // Qualification Booster bật ở ĐÚNG vòng này -> mỗi cầu thủ đá chính ra sân & đi tiếp +2.
  const qualActive = Number(team?.qualification) === Number(round.id);

  // Booster "12th Man" CHỈ áp dụng cho ĐÚNG vòng đã dùng (team.twelfthMan.roundId).
  // team.twelfthMan là bản ghi lịch sử nên vẫn còn ở các vòng sau — không gate theo vòng
  // thì cầu thủ 12th sẽ bị gắn cờ + nhồi vào đội hình của mọi vòng tiếp theo (vd Wildcard),
  // tạo ra cầu thủ thứ 12 sai ở vòng không hề dùng booster này.
  const twelfthManThisRound = Number(team?.twelfthMan?.roundId) === Number(round.id);

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
    const basePoints = isMaxCaptain || (!hasMaxCaptain && isCaptain) ? rawPoints * 2 : rawPoints;
    const qualBonus = qualificationBonus({
      player,
      roundId: round.id,
      qualActive,
      advancedSquadIds,
      round,
      squadsById,
      playerStatsById,
    });
    const points = basePoints + qualBonus;

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
      qualBonus,
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
      isTwelfthMan: twelfthManThisRound && Number(team.twelfthMan?.playerId) === Number(player.id),
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

  if (twelfthManThisRound && team.twelfthMan?.playerId && !starters.some((player) => player.id === Number(team.twelfthMan.playerId))) {
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
  // Tập squadId đi tiếp sau mỗi vòng (cho Qualification Booster) — tính 1 lần, dùng lại.
  const advancedByRound = new Map(
    FANTASY_ROUNDS.map((item) => [item.id, advancedSquadIdsFor(item.id, roundsById)])
  );
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
    const transferFees = { ...(previous.transferFees || {}) };

    for (const item of FANTASY_ROUNDS) {
      const row = rankingByRound.get(item.id)?.get(userId);
      const historyTeam = histories?.[item.id]?.[userId]?.team;
      const calculatedPoints = calculatedTeamRoundPoints(historyTeam, item.id, playersById, {
        round: roundsById.get(item.id),
        squadsById,
        playerStatsById,
        advancedSquadIds: advancedByRound.get(item.id),
      });
      if (calculatedPoints != null) {
        roundPoints[item.key] = calculatedPoints;
        transferFees[item.key] = teamTransferFee(historyTeam);
      } else if (historyTeam?.roundPoints != null) {
        roundPoints[item.key] = Number(historyTeam.roundPoints);
        transferFees[item.key] = teamTransferFee(historyTeam);
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
    // Điểm TỔNG = tổng điểm các vòng TRỪ phí chuyển nhượng của từng vòng.
    const totalPoints = syncedRoundKeys.length
      ? syncedRoundKeys.reduce(
          (total, key) => total + Number(roundPoints[key] || 0) - Number(transferFees[key] || 0),
          0
        )
      : Number(rank.overallPoints ?? rank.total ?? previous.totalPoints ?? previous.total ?? 0);

    return {
      userId,
      rank: rank.overallRank ?? index + 1,
      roundRank: rank.roundRank ?? index + 1,
      manager,
      team: "",
      rounds: roundPoints,
      transferFees,
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
      const squad = normalizeFantasySquad({ team: raw, round, playersById, squadsById, localPlayersByTeam, playerStatsById, advancedSquadIds: advancedByRound.get(item.id) });
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
