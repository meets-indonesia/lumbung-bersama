import { chmod, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stdin } from "node:process";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const useStdin = args.includes("--stdin");
const dryRun = args.includes("--dry-run");
const envPath = resolve(fileIndex >= 0 ? args[fileIndex + 1] : ".env");

function usage() {
  console.error("Usage: node scripts/merge-env.mjs --file .env --stdin [--dry-run]");
  process.exit(1);
}

if (fileIndex >= 0 && !args[fileIndex + 1]) usage();
if (!useStdin) usage();

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEntries(content) {
  const entries = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = normalized.slice(0, equalsIndex).trim();
    const value = stripQuotes(normalized.slice(equalsIndex + 1));
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid env key: ${key}`);
    }
    entries.push([key, value]);
  }

  return entries;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function serializeEnv(existingContent, updates) {
  const updateMap = new Map(updates);
  const touched = new Set();
  const lines = existingContent ? existingContent.split(/\r?\n/) : [];
  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const equalsIndex = normalized.indexOf("=");
    if (!trimmed || trimmed.startsWith("#") || equalsIndex <= 0) return line;

    const key = normalized.slice(0, equalsIndex).trim();
    if (!updateMap.has(key)) return line;

    touched.add(key);
    return `${key}=${updateMap.get(key)}`;
  });

  for (const [key, value] of updateMap.entries()) {
    if (!touched.has(key)) nextLines.push(`${key}=${value}`);
  }

  return `${nextLines.join("\n").replace(/\n+$/, "")}\n`;
}

const stdinContent = await readStdin();
const updates = parseEntries(stdinContent);

if (!updates.length) {
  console.error("No KEY=value entries received on stdin.");
  process.exit(1);
}

let existingContent = "";
try {
  existingContent = await readFile(envPath, "utf8");
} catch {
  existingContent = "";
}

const merged = serializeEnv(existingContent, updates);
const keys = updates.map(([key]) => key);

if (!dryRun) {
  const tmpPath = resolve(dirname(envPath), `.env.merge-${Date.now()}.tmp`);
  await writeFile(tmpPath, merged, { mode: 0o600 });
  await chmod(tmpPath, 0o600).catch(() => {});
  await rename(tmpPath, envPath);
  await chmod(envPath, 0o600).catch(() => {});
}

console.log(
  JSON.stringify(
    {
      file: envPath,
      dryRun,
      updatedKeys: keys,
      redacted: true,
    },
    null,
    2,
  ),
);
