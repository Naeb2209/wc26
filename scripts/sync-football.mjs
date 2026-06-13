#!/usr/bin/env node
/**
 * Snapshot World Cup data from football-data.org into data/db.json.
 *
 * Run manually when the local database needs refreshing:
 *   npm run sync-football
 *
 * The web app reads standings, teams and schedule only from db.json.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "db.json");
const TMP_PATH = `${DB_PATH}.tmp`;
const ENV_PATH = join(ROOT, ".env.local");

function loadEnv() {
  const env = { ...process.env };
  if (!existsSync(ENV_PATH)) return env;

  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in env)) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

async function fetchFootballData(path, token) {
  const response = await fetch(`https://api.football-data.org/v4${path}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${path}: HTTP ${response.status} ${detail.slice(0, 160)}`);
  }
  return response.json();
}

function groupLabel(raw) {
  if (!raw) return null;
  const letter = String(raw).replace(/group/i, "").replace(/[_\s]/g, "").trim().toUpperCase();
  return letter ? `Bảng ${letter}` : null;
}

function roundLabel(matchday) {
  const number = Number(matchday);
  return number >= 1 && number <= 3 ? `Lượt ${number}` : null;
}

function formatDate(utc) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(utc));
}

function formatTime(utc) {
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(utc));
  return `${time} (giờ VN)`;
}

function mapPosition(position = "") {
  const value = position.toLowerCase();
  if (value.includes("keeper")) return "Thủ Môn";
  if (value.includes("back") || value.includes("defen")) return "Hậu Vệ";
  if (value.includes("midfield")) return "Tiền Vệ";
  if (
    value.includes("forward") ||
    value.includes("wing") ||
    value.includes("offen") ||
    value.includes("strik") ||
    value.includes("attack")
  ) {
    return "Tiền Đạo";
  }
  return "Tiền Vệ";
}

function mapGroups(json, fifaRanks) {
  return (json.standings || [])
    .filter((standing) => (standing.type || "TOTAL") === "TOTAL" && standing.group)
    .map((standing) => ({
      name: groupLabel(standing.group),
      rows: (standing.table || []).map((row) => {
        const code = row.team?.tla || "";
        return {
          team: row.team?.shortName || row.team?.name || code,
          code,
          flag: row.team?.crest || "",
          iso: "",
          fifaRank: fifaRanks[code] ?? null,
          p: row.playedGames ?? 0,
          w: row.won ?? 0,
          d: row.draw ?? 0,
          l: row.lost ?? 0,
          gf: row.goalsFor ?? 0,
          ga: row.goalsAgainst ?? 0,
          gd: row.goalDifference ?? 0,
          pts: row.points ?? 0,
        };
      }),
    }))
    .filter((group) => group.name && group.rows.length)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

function mapSchedule(json, previousSchedule) {
  const rounds = ["Lượt 1", "Lượt 2", "Lượt 3"];
  const matches = Object.fromEntries(rounds.map((round) => [round, []]));
  const oldMatches = previousSchedule?.["Vòng Bảng"]?.matches || {};
  const oldByTeams = new Map(
    Object.values(oldMatches)
      .flat()
      .map((match) => [`${match.homeCode}-${match.awayCode}`, match])
  );

  for (const match of json.matches || []) {
    if (match.stage !== "GROUP_STAGE") continue;
    const round = roundLabel(match.matchday);
    if (!round) continue;

    const homeCode = match.homeTeam?.tla || match.homeTeam?.shortName || "TBD";
    const awayCode = match.awayTeam?.tla || match.awayTeam?.shortName || "TBD";
    const previous = oldByTeams.get(`${homeCode}-${awayCode}`) || {};
    matches[round].push({
      id: String(match.id),
      group: groupLabel(match.group) || "Vòng bảng",
      date: formatDate(match.utcDate),
      venue: match.venue || "",
      homeCode,
      homeFlag: match.homeTeam?.crest || "",
      homeIso: "",
      awayCode,
      awayFlag: match.awayTeam?.crest || "",
      awayIso: "",
      time: formatTime(match.utcDate),
      lineup: previous.lineup || null,
      note: previous.note || "",
    });
  }

  for (const round of rounds) {
    matches[round].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  return { "Vòng Bảng": { rounds, matches } };
}

function mapTeams(json, previousTeams) {
  const previousByCode = new Map((previousTeams || []).map((team) => [team.code, team]));
  return (json.teams || [])
    .map((team) => {
      const code = team.tla || "";
      const previous = previousByCode.get(code) || {};
      const previousPlayers = new Map(
        (previous.players || []).map((player) => [player.name, player])
      );
      const squad = (team.squad || []).map((player) => {
        const old = previousPlayers.get(player.name) || {};
        return {
          ...old,
          name: player.name,
          number: player.shirtNumber ?? old.number ?? null,
          position: mapPosition(player.position),
          isStar: old.isStar || false,
        };
      });
      return {
        ...previous,
        code,
        name: team.shortName || team.name || code,
        flag: team.crest || previous.flag || "",
        players: squad.length ? squad : previous.players || [],
      };
    })
    .filter((team) => team.code)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

async function main() {
  const env = loadEnv();
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("Thiếu FOOTBALL_DATA_TOKEN trong .env.local");

  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  console.log("Đang tải standings, lịch đấu và đội tuyển từ football-data.org...");
  const [standingsJson, matchesJson, teamsJson] = await Promise.all([
    fetchFootballData("/competitions/WC/standings", token),
    fetchFootballData("/competitions/WC/matches", token),
    fetchFootballData("/competitions/WC/teams", token),
  ]);

  const groups = mapGroups(standingsJson, db.fifaRanks || {});
  const schedule = mapSchedule(matchesJson, db.schedule);
  const teams = mapTeams(teamsJson, db.teams);
  const matchCount = Object.values(schedule["Vòng Bảng"].matches).flat().length;

  if (!groups.length) throw new Error("API không trả về bảng đấu; db.json chưa được thay đổi");
  if (!matchCount) throw new Error("API không trả về lịch vòng bảng; db.json chưa được thay đổi");
  if (!teams.length) throw new Error("API không trả về đội tuyển; db.json chưa được thay đổi");

  const nextDb = {
    ...db,
    dataSync: {
      provider: "football-data",
      syncedAt: new Date().toISOString(),
      groups: groups.length,
      teams: teams.length,
      groupMatches: matchCount,
    },
    groups,
    teams,
    schedule: { ...db.schedule, ...schedule },
  };

  writeFileSync(TMP_PATH, `${JSON.stringify(nextDb, null, 2)}\n`, "utf8");
  renameSync(TMP_PATH, DB_PATH);
  console.log(`Đã ghi ${groups.length} bảng, ${teams.length} đội và ${matchCount} trận vào data/db.json.`);
}

main().catch((error) => {
  console.error(`Sync thất bại: ${error.message}`);
  process.exitCode = 1;
});
