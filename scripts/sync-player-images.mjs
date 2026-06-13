#!/usr/bin/env node
/**
 * Add player portraits from TheSportsDB to data/db.json.
 *
 * Sync one team:
 *   npm run sync-player-images -- ARG
 *
 * Sync every team (slow on the free 30 requests/minute plan):
 *   npm run sync-player-images -- all
 */

import { readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "db.json");
const TMP_PATH = `${DB_PATH}.tmp`;
const API_KEY = process.env.THESPORTSDB_API_KEY || "123";
const REQUEST_DELAY_MS = Number(process.env.PLAYER_IMAGE_REQUEST_DELAY_MS || 500);
const RATE_LIMIT_DELAY_MS = 61000;
const PLAYER_ALIASES = {
  "Christian Romero": "Cristian Romero",
};

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.'’-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findPortrait(name) {
  const searchName = PLAYER_ALIASES[name] || name;
  const url = new URL(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchplayers.php`);
  url.searchParams.set("p", searchName);
  let response = await fetch(url, { headers: { accept: "application/json" } });
  if (response.status === 429) {
    console.log("  … đạt giới hạn API, chờ 61 giây rồi thử lại");
    await wait(RATE_LIMIT_DELAY_MS);
    response = await fetch(url, { headers: { accept: "application/json" } });
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  const expected = normalize(searchName);
  const candidates = (json.player || []).filter(
    (player) =>
      normalize(player.strPlayer) === expected &&
      (!player.strSport || player.strSport === "Soccer")
  );
  const player = candidates.find((item) => item.strCutout) || candidates.find((item) => item.strThumb);
  if (!player) return null;

  return {
    avatar: player.strCutout || player.strThumb,
    avatarSource: "thesportsdb",
    sportsDbId: player.idPlayer || null,
  };
}

async function main() {
  const target = (process.argv[2] || "").toUpperCase();
  if (!target) {
    throw new Error("Hãy truyền mã đội, ví dụ: npm run sync-player-images -- ARG");
  }

  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const teams = target === "ALL" ? db.teams : db.teams.filter((team) => team.code === target);
  if (!teams.length) throw new Error(`Không tìm thấy đội ${target}`);

  let found = 0;
  let missing = 0;
  let requestCount = 0;

  for (const team of teams) {
    let teamFound = 0;
    let teamMissing = 0;
    console.log(`\n${team.code} - ${team.name}`);
    for (const player of team.players || []) {
      if (player.avatar) {
        console.log(`  = ${player.name} (đã có ảnh)`);
        continue;
      }

      if (requestCount > 0) await wait(REQUEST_DELAY_MS);
      requestCount += 1;
      try {
        const portrait = await findPortrait(player.name);
        if (portrait) {
          Object.assign(player, portrait);
          found += 1;
          teamFound += 1;
          console.log(`  ✓ ${player.name}`);
        } else {
          missing += 1;
          teamMissing += 1;
          console.log(`  - ${player.name} (không tìm thấy)`);
        }
      } catch (error) {
        missing += 1;
        teamMissing += 1;
        console.log(`  ! ${player.name}: ${error.message}`);
      }
    }

    db.playerImagesSync = {
      provider: "thesportsdb",
      syncedAt: new Date().toISOString(),
      target,
      lastTeam: team.code,
      found,
      missing,
    };
    writeFileSync(TMP_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    renameSync(TMP_PATH, DB_PATH);
    console.log(`  → đã lưu checkpoint: +${teamFound} ảnh, thiếu ${teamMissing}`);
  }

  console.log(`\nĐã lưu ${found} ảnh; không tìm thấy ${missing} cầu thủ.`);
}

main().catch((error) => {
  console.error(`Sync ảnh thất bại: ${error.message}`);
  process.exitCode = 1;
});
