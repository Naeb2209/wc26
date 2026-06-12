#!/usr/bin/env node
/**
 * Fill missing player portraits from English Wikipedia page images.
 * Existing portraits are never overwritten.
 *
 * Run:
 *   npm run sync-wikimedia-images
 */

import { readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "db.json");
const TMP_PATH = `${DB_PATH}.tmp`;
const BATCH_SIZE = 40;
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

async function fetchBatch(players) {
  const searchNames = players.map((player) => PLAYER_ALIASES[player.name] || player.name);
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "700");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", searchNames.join("|"));

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "PitchPulse2026/1.0 (local World Cup dashboard)",
    },
  });
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  const json = await response.json();

  const redirects = new Map(
    (json.query?.redirects || []).map((item) => [normalize(item.from), normalize(item.to)])
  );
  const pages = Object.values(json.query?.pages || {});
  const imagesByTitle = new Map(
    pages
      .filter((page) => page.thumbnail?.source)
      .map((page) => [normalize(page.title), page.thumbnail.source])
  );

  let found = 0;
  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    const searched = normalize(searchNames[index]);
    const resolved = redirects.get(searched) || searched;
    const avatar = imagesByTitle.get(resolved);
    if (!avatar) continue;

    player.avatar = avatar;
    player.avatarSource = "wikimedia";
    found += 1;
  }
  return found;
}

async function main() {
  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const missing = db.teams.flatMap((team) =>
    (team.players || []).filter((player) => !player.avatar)
  );
  let found = 0;

  console.log(`Đang tìm ảnh Wikimedia cho ${missing.length} cầu thủ...`);
  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    const batch = missing.slice(index, index + BATCH_SIZE);
    const batchFound = await fetchBatch(batch);
    found += batchFound;
    console.log(
      `  ${Math.min(index + BATCH_SIZE, missing.length)}/${missing.length}: +${batchFound} ảnh`
    );
  }

  db.playerImagesSync = {
    provider: "thesportsdb+wikimedia",
    syncedAt: new Date().toISOString(),
    foundFromWikimedia: found,
    remaining: missing.length - found,
  };
  writeFileSync(TMP_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  renameSync(TMP_PATH, DB_PATH);
  console.log(`Đã lưu thêm ${found} ảnh; còn thiếu ${missing.length - found}.`);
}

main().catch((error) => {
  console.error(`Sync Wikimedia thất bại: ${error.message}`);
  process.exitCode = 1;
});
