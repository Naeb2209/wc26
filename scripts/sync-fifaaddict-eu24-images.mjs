#!/usr/bin/env node
/**
 * Prefer UEFA EURO 2024 cutout portraits from FIFA Addict.
 *
 * Run:
 *   npm run sync-eu24-images
 */

import { readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "db.json");
const TMP_PATH = `${DB_PATH}.tmp`;
const SOURCE_URL = "https://vn.fifaaddict.com/fo4db?sv=vn&class=eu24";
const EURO_2024_TEAMS = new Set([
  "ALB", "AUT", "BEL", "CRO", "CZE", "DEN", "ENG", "FRA",
  "GEO", "GER", "HUN", "ITA", "NED", "POL", "POR", "ROU",
  "SCO", "SRB", "SVK", "SLO", "ESP", "SUI", "TUR", "UKR",
]);
const PLAYER_ALIASES = {
  "Cristiano Ronaldo": "Cristiano Ronaldo",
  "Diogo Dalot": "Diogo Dalot",
  "Joao Cancelo": "Joao Cancelo",
  "Joao Felix": "Joao Felix",
  "Joao Palhinha": "Joao Palhinha",
  "Joao Neves": "Joao Neves",
  "Ruben Dias": "Ruben Dias",
};

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findMatch(playerName, portraits) {
  const wanted = normalize(PLAYER_ALIASES[playerName] || playerName);
  const exact = portraits.filter((portrait) => normalize(portrait.name) === wanted);
  if (exact.length === 1) return exact[0];

  const wantedParts = wanted.split(" ");
  if (wantedParts.length < 2) return null;

  const firstInitial = wantedParts[0][0];
  const surname = wantedParts.at(-1);
  const abbreviated = portraits.filter((portrait) => {
    const parts = normalize(portrait.name).split(" ");
    return (
      parts.length === 2 &&
      parts[0].length === 1 &&
      parts[0] === firstInitial &&
      parts[1] === surname
    );
  });
  return abbreviated.length === 1 ? abbreviated[0] : null;
}

async function loadPortraits() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      accept: "text/html",
      "user-agent": "PitchPulse2026/1.0 (local World Cup dashboard)",
    },
  });
  if (!response.ok) throw new Error(`FIFA Addict HTTP ${response.status}`);

  const html = await response.text();
  const portraits = [];
  const pattern =
    /<img[^>]+src="([^"]*\/fo4\/players\/[^"]+)"[^>]+alt="FO4 Player - ([^"]+)"[^>]*>[\s\S]*?<a[^>]+href="(\/fo4db\/pid[^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    portraits.push({
      avatar: match[1].replaceAll("&amp;", "&"),
      name: match[2].replaceAll("&amp;", "&"),
      profile: new URL(match[3], SOURCE_URL).href,
    });
  }
  if (!portraits.length) throw new Error("Khong tim thay danh sach cau thu EU24");
  return portraits;
}

async function main() {
  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const portraits = await loadPortraits();
  let updated = 0;

  for (const team of db.teams || []) {
    if (!EURO_2024_TEAMS.has(team.code)) continue;

    for (const player of team.players || []) {
      const match = findMatch(player.name, portraits);
      if (!match) continue;

      player.avatar = match.avatar;
      player.avatarSource = "fifaaddict-eu24";
      player.avatarProfile = match.profile;
      updated += 1;
      console.log(`  + ${team.code} ${player.name} <- ${match.name}`);
    }
  }

  db.playerImagesSync = {
    provider: "fifaaddict-eu24",
    source: SOURCE_URL,
    syncedAt: new Date().toISOString(),
    available: portraits.length,
    updated,
  };
  writeFileSync(TMP_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  renameSync(TMP_PATH, DB_PATH);
  console.log(`Da cap nhat ${updated} anh EU24 tu ${portraits.length} cau thu.`);
}

main().catch((error) => {
  console.error(`Sync anh EU24 that bai: ${error.message}`);
  process.exitCode = 1;
});
