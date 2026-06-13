#!/usr/bin/env node

import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKBOOK_PATH = join(ROOT, "player-image-download-links.xlsx");
const WORKBOOK_BACKUP_PATH = join(ROOT, "player-image-download-links.before-download.xlsx");
const DB_PATH = join(ROOT, "data", "db.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;
const PLAYERS_DIR = join(ROOT, "public", "players");
const PROTECTED_TEAMS = new Set(["ENG", "FRA", "GER"]);
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const CONCURRENCY = Number(process.env.PLAYER_IMAGE_DOWNLOAD_CONCURRENCY || 8);
const RETRIES = Number(process.env.PLAYER_IMAGE_DOWNLOAD_RETRIES || 2);
const PROTECTED_ONLY = process.argv.includes("--protected-only");

function cellText(cell) {
  const value = cell.value;
  if (value && typeof value === "object") {
    return String(value.hyperlink || value.text || "").trim();
  }
  return String(value || "").trim();
}

function assertInside(parent, child) {
  const rel = relative(parent, child);
  if (!rel || rel.startsWith(`..${sep}`) || rel === ".." || resolve(child) === resolve(parent)) {
    throw new Error(`Unsafe target path: ${child}`);
  }
}

async function deleteTeamImages(teamCode) {
  const teamDir = join(PLAYERS_DIR, teamCode);
  assertInside(PLAYERS_DIR, teamDir);
  if (!existsSync(teamDir)) return 0;

  let deleted = 0;
  for (const entry of await readdir(teamDir, { withFileTypes: true })) {
    if (!entry.isFile() || !IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    await rm(join(teamDir, entry.name));
    deleted += 1;
  }
  return deleted;
}

function isImage(bytes) {
  if (bytes.length < 12) return false;
  return (
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    bytes.subarray(0, 6).toString("ascii").startsWith("GIF8") ||
    (bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
    bytes.subarray(4, 12).toString("ascii").includes("ftypavif")
  );
}

async function downloadImage(url, targetPath) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.1",
          "user-agent": "Mozilla/5.0 WC26PlayerImageDownloader/1.0",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 100) throw new Error(`Image is too small (${bytes.length} bytes)`);
      if (!isImage(bytes)) {
        const contentType = response.headers.get("content-type") || "unknown";
        throw new Error(`Response is not a recognized image (${contentType})`);
      }

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, bytes);
      return bytes.length;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 750 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function runPool(items, worker) {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

function findPlayer(db, teamCode, playerName) {
  const team = db.teams?.find((item) => item.code === teamCode);
  return team?.players?.find((item) => item.name === playerName);
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);
  const sheet = workbook.getWorksheet("Player Images");
  if (!sheet) throw new Error('Missing sheet "Player Images"');

  const db = JSON.parse(await readFile(DB_PATH, "utf8"));
  const rows = [];
  const teams = new Set();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const teamCode = cellText(row.getCell(1)).toUpperCase();
    if (!teamCode) continue;

    const playerName = cellText(row.getCell(3));
    const currentAvatar = cellText(row.getCell(6));
    const downloadUrl = cellText(row.getCell(7));
    const sourceUrl = downloadUrl || currentAvatar;
    let targetRelative = cellText(row.getCell(8)).replaceAll("/", sep);
    let targetPath = resolve(ROOT, targetRelative);

    assertInside(PLAYERS_DIR, targetPath);
    if (relative(PLAYERS_DIR, targetPath).split(sep)[0] !== teamCode) {
      throw new Error(`Team/target mismatch on row ${rowNumber}: ${teamCode} -> ${targetRelative}`);
    }

    if (PROTECTED_TEAMS.has(teamCode) && !existsSync(targetPath)) {
      const extension = extname(targetPath);
      const stem = targetPath.slice(0, -extension.length);
      const existingPath = [...IMAGE_EXTENSIONS]
        .map((candidateExtension) => `${stem}${candidateExtension}`)
        .find((candidatePath) => existsSync(candidatePath));
      if (existingPath) {
        targetPath = existingPath;
        targetRelative = relative(ROOT, existingPath);
        row.getCell(8).value = targetRelative.replaceAll(sep, "/");
      }
    }

    teams.add(teamCode);
    rows.push({
      row,
      rowNumber,
      teamCode,
      playerName,
      sourceUrl,
      targetPath,
      targetRelative: targetRelative.replaceAll(sep, "/"),
    });
  }

  let deleted = 0;
  if (!PROTECTED_ONLY) {
    for (const teamCode of teams) {
      if (!PROTECTED_TEAMS.has(teamCode)) deleted += await deleteTeamImages(teamCode);
    }
  }

  const downloads = PROTECTED_ONLY
    ? []
    : rows.filter((item) => !PROTECTED_TEAMS.has(item.teamCode) && item.sourceUrl);
  let downloaded = 0;
  let failed = 0;
  let bytes = 0;

  await runPool(downloads, async (item) => {
    try {
      const size = await downloadImage(item.sourceUrl, item.targetPath);
      item.row.getCell(9).value = "Downloaded";
      item.row.getCell(10).value = "";
      downloaded += 1;
      bytes += size;
    } catch (error) {
      item.row.getCell(9).value = "Failed";
      item.row.getCell(10).value = error.message;
      failed += 1;
      console.error(`FAILED ${item.teamCode} ${item.playerName}: ${error.message}`);
    }
  });

  let noUrl = 0;
  let protectedRows = 0;
  let localAvatars = 0;
  let missingProtectedTargets = 0;

  for (const item of rows) {
    if (PROTECTED_TEAMS.has(item.teamCode)) {
      item.row.getCell(9).value = "Downloaded";
      item.row.getCell(10).value = "Kept existing downloaded image";
      protectedRows += 1;
      if (!existsSync(item.targetPath)) missingProtectedTargets += 1;
    } else if (!item.sourceUrl) {
      item.row.getCell(9).value = "No URL";
      item.row.getCell(10).value = "No link in Download URL or Current Avatar";
      noUrl += 1;
    }

    if (existsSync(item.targetPath) && (await stat(item.targetPath)).isFile()) {
      const player = findPlayer(db, item.teamCode, item.playerName);
      if (player) {
        player.avatar = `/${item.targetRelative.replace(/^public\//, "")}`;
        player.avatarSource = "local-xlsx";
        localAvatars += 1;
      }
    }
  }

  if (!existsSync(WORKBOOK_BACKUP_PATH)) {
    await copyFile(WORKBOOK_PATH, WORKBOOK_BACKUP_PATH);
  }
  await workbook.xlsx.writeFile(WORKBOOK_PATH);
  await writeFile(DB_TMP_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await rename(DB_TMP_PATH, DB_PATH);

  console.log(JSON.stringify({
    protectedTeams: [...PROTECTED_TEAMS],
    protectedRows,
    missingProtectedTargets,
    deleted,
    downloaded,
    failed,
    noUrl,
    localAvatars,
    megabytes: Number((bytes / 1024 / 1024).toFixed(2)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
